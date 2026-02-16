import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberApplicationRoles, applicationRoleAction, applicationRoles, actions, resources, applications, member } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

// Simple in-memory cache for permissions (TTL: 60 seconds)
const permissionsCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds
const MAX_CACHE_ENTRIES = 500;

function getCacheKey(memberId: string, applicationId: string): string {
    return `${memberId}:${applicationId}`;
}

function getFromCache(key: string): unknown | null {
    const cached = permissionsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    permissionsCache.delete(key);
    return null;
}

function setCache(key: string, data: unknown): void {
    if (permissionsCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = permissionsCache.keys().next().value;
        if (oldestKey) {
            permissionsCache.delete(oldestKey);
        }
    }
    permissionsCache.set(key, { data, timestamp: Date.now() });
}

// GET /api/rbac/permissions - Get all permissions for a member in an application
// Query params: memberId, applicationKey (or applicationId)
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    const userRole = authResult.user.role;

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const applicationKey = searchParams.get("applicationKey");
    const applicationId = searchParams.get("applicationId");

    if (!memberId) {
        return NextResponse.json(
            { error: "memberId is required" },
            { status: 400 }
        );
    }

    if (!applicationKey && !applicationId) {
        return NextResponse.json(
            { error: "applicationKey or applicationId is required" },
            { status: 400 }
        );
    }

    const memberRecord = await db
        .select({
            userId: member.userId,
            role: member.role,
            organizationId: member.organizationId,
        })
        .from(member)
        .where(eq(member.id, memberId))
        .limit(1);

    if (memberRecord.length === 0) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const targetMember = memberRecord[0];

    // Authorization check: only admin or the member themselves can query permissions
    if (userRole !== "admin" && targetMember.userId !== authResult.user.id) {
        return NextResponse.json({ error: "Forbidden: Cannot query other members' permissions" }, { status: 403 });
    }

    // Hierarchy layer 1: platform admin has full access.
    if (userRole === "admin") {
        return NextResponse.json({
            memberId,
            applicationId: applicationId || null,
            roles: [{ roleKey: "platform-admin", roleName: "Platform Admin" }],
            permissions: [
                {
                    roleKey: "platform-admin",
                    roleName: "Platform Admin",
                    resourceKey: "*",
                    resourceName: "all-resources",
                    actionKey: "*",
                    actionName: "all-actions",
                },
            ],
            reason: "PLATFORM_ADMIN",
        });
    }

    // Hierarchy layer 2: organization owner/admin inherits full access.
    if (targetMember.role === "owner" || targetMember.role === "admin") {
        return NextResponse.json({
            memberId,
            applicationId: applicationId || null,
            roles: [
                {
                    roleKey: targetMember.role,
                    roleName: targetMember.role,
                },
            ],
            permissions: [
                {
                    roleKey: targetMember.role,
                    roleName: targetMember.role,
                    resourceKey: "*",
                    resourceName: "all-resources",
                    actionKey: "*",
                    actionName: "all-actions",
                },
            ],
            reason: "ORGANIZATION_ROLE_INHERIT",
        });
    }

    try {
        // Find the application
        let targetApplicationId: string;
        if (applicationId) {
            targetApplicationId = applicationId;
        } else {
            const application = await db
                .select({ id: applications.id })
                .from(applications)
                .where(eq(applications.key, applicationKey!))
                .limit(1);

            if (application.length === 0) {
                return NextResponse.json({ permissions: [], reason: "Application not found" });
            }
            targetApplicationId = application[0].id;
        }

        // Check cache
        const cacheKey = getCacheKey(memberId, targetApplicationId);
        const cachedResult = getFromCache(cacheKey);
        if (cachedResult) {
            return NextResponse.json(cachedResult);
        }

        // Get member's roles for this application (filter through applicationRoles.applicationId)
        const memberRoles = await db
            .select({
                roleId: memberApplicationRoles.applicationRoleId,
                roleKey: applicationRoles.key,
                roleName: applicationRoles.name,
            })
            .from(memberApplicationRoles)
            .innerJoin(applicationRoles, eq(memberApplicationRoles.applicationRoleId, applicationRoles.id))
            .where(
                and(
                    eq(memberApplicationRoles.memberId, memberId),
                    eq(applicationRoles.applicationId, targetApplicationId)
                )
            );

        if (memberRoles.length === 0) {
            const result = {
                memberId,
                applicationId: targetApplicationId,
                roles: [],
                permissions: [],
            };
            setCache(cacheKey, result);
            return NextResponse.json(result);
        }

        // Optimized: Get all actions for all roles in a single query (fixes N+1)
        const roleIds = memberRoles.map(r => r.roleId);
        const allRoleActions = await db
            .select({
                roleId: applicationRoleAction.roleId,
                actionId: applicationRoleAction.actionId,
                actionKey: actions.key,
                actionName: actions.name,
                resourceId: actions.resourceId,
                resourceKey: resources.key,
                resourceName: resources.name,
            })
            .from(applicationRoleAction)
            .innerJoin(actions, eq(applicationRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(inArray(applicationRoleAction.roleId, roleIds));

        // Create role lookup map
        const roleMap = new Map(memberRoles.map(r => [r.roleId, { roleKey: r.roleKey, roleName: r.roleName }]));

        // Build permissions with role info
        const allPermissions = allRoleActions.map(action => {
            const role = roleMap.get(action.roleId);
            return {
                roleKey: role?.roleKey || "",
                roleName: role?.roleName || "",
                resourceKey: action.resourceKey,
                resourceName: action.resourceName,
                actionKey: action.actionKey,
                actionName: action.actionName,
            };
        });

        // Deduplicate permissions (keep unique resource:action combinations)
        const uniquePermissions = Array.from(
            new Map(
                allPermissions.map(p => [`${p.resourceKey}:${p.actionKey}`, p])
            ).values()
        );

        const result = {
            memberId,
            applicationId: targetApplicationId,
            roles: memberRoles,
            permissions: uniquePermissions,
        };

        // Cache the result
        setCache(cacheKey, result);

        return NextResponse.json(result);
    } catch (error) {
        return handleApiError(error, "fetch permissions");
    }
}
