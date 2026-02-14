import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberAppRoles, appRoleAction, appRoles, actions, resources, apps, member } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

// Simple in-memory cache for permissions (TTL: 60 seconds)
const permissionsCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds
const MAX_CACHE_ENTRIES = 500;

function getCacheKey(memberId: string, appId: string): string {
    return `${memberId}:${appId}`;
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

// GET /api/rbac/permissions - Get all permissions for a member in an app
// Query params: memberId, appKey (or appId)
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    const userRole = authResult.user.role;

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const appKey = searchParams.get("appKey");
    const appId = searchParams.get("appId");

    if (!memberId) {
        return NextResponse.json(
            { error: "memberId is required" },
            { status: 400 }
        );
    }

    if (!appKey && !appId) {
        return NextResponse.json(
            { error: "appKey or appId is required" },
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
            appId: appId || null,
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
            appId: appId || null,
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
        // Find the app
        let targetAppId: string;
        if (appId) {
            targetAppId = appId;
        } else {
            const app = await db
                .select({ id: apps.id })
                .from(apps)
                .where(eq(apps.key, appKey!))
                .limit(1);

            if (app.length === 0) {
                return NextResponse.json({ permissions: [], reason: "App not found" });
            }
            targetAppId = app[0].id;
        }

        // Check cache
        const cacheKey = getCacheKey(memberId, targetAppId);
        const cachedResult = getFromCache(cacheKey);
        if (cachedResult) {
            return NextResponse.json(cachedResult);
        }

        // Get member's roles for this app (filter through appRoles.appId)
        const memberRoles = await db
            .select({
                roleId: memberAppRoles.appRoleId,
                roleKey: appRoles.key,
                roleName: appRoles.name,
            })
            .from(memberAppRoles)
            .innerJoin(appRoles, eq(memberAppRoles.appRoleId, appRoles.id))
            .where(
                and(
                    eq(memberAppRoles.memberId, memberId),
                    eq(appRoles.appId, targetAppId)
                )
            );

        if (memberRoles.length === 0) {
            const result = {
                memberId,
                appId: targetAppId,
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
                roleId: appRoleAction.roleId,
                actionId: appRoleAction.actionId,
                actionKey: actions.key,
                actionName: actions.name,
                resourceId: actions.resourceId,
                resourceKey: resources.key,
                resourceName: resources.name,
            })
            .from(appRoleAction)
            .innerJoin(actions, eq(appRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(inArray(appRoleAction.roleId, roleIds));

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
            appId: targetAppId,
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
