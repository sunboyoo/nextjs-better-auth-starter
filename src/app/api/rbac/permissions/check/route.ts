import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberOrganizationAppRoles, organizationAppRoleAction, organizationAppRoles, actions, resources, apps, member } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { handleApiError } from "@/lib/api/error-handler";
import { auth } from "@/lib/auth";
import { extendedAuthApi } from "@/lib/auth-api";

// Simple in-memory cache for permission checks (TTL: 60 seconds)
const permissionCheckCache = new Map<string, { data: boolean; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds
const MAX_CACHE_ENTRIES = 1000;

function getCacheKey(memberId: string, appKey: string, resourceKey: string, actionKey: string): string {
    return `${memberId}:${appKey}:${resourceKey}:${actionKey}`;
}

function getFromCache(key: string): boolean | null {
    const cached = permissionCheckCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    permissionCheckCache.delete(key);
    return null;
}

function setCache(key: string, data: boolean): void {
    if (permissionCheckCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = permissionCheckCache.keys().next().value;
        if (oldestKey) {
            permissionCheckCache.delete(oldestKey);
        }
    }
    permissionCheckCache.set(key, { data, timestamp: Date.now() });
}

// GET /api/rbac/permissions/check - Check if member has permission
// Query params: memberId, appKey, resourceKey, actionKey
export async function GET(request: NextRequest) {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as { role?: string | null }).role;

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const appKey = searchParams.get("appKey");
    const resourceKey = searchParams.get("resourceKey");
    const actionKey = searchParams.get("actionKey");

    if (!memberId || !appKey || !resourceKey || !actionKey) {
        return NextResponse.json(
            { error: "memberId, appKey, resourceKey, and actionKey are required" },
            { status: 400 }
        );
    }

    const memberRecord = await db
        .select({
            userId: member.userId,
            organizationId: member.organizationId,
            role: member.role,
        })
        .from(member)
        .where(eq(member.id, memberId))
        .limit(1);

    if (memberRecord.length === 0) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const targetMember = memberRecord[0];

    // Authorization check: only platform admin or the member themselves can check permissions
    if (userRole !== "admin" && targetMember.userId !== session.user.id) {
        return NextResponse.json(
            { error: "Forbidden: Cannot check other members' permissions" },
            { status: 403 }
        );
    }

    // Hierarchy layer 1: platform admin bypasses all checks.
    if (userRole === "admin") {
        return NextResponse.json({
            hasPermission: true,
            memberId,
            appKey,
            resourceKey,
            actionKey,
            reason: "PLATFORM_ADMIN",
        });
    }

    // Hierarchy layer 2: organization owner/admin inherits full app-level access.
    if (targetMember.role === "owner" || targetMember.role === "admin") {
        return NextResponse.json({
            hasPermission: true,
            memberId,
            appKey,
            resourceKey,
            actionKey,
            reason: "ORGANIZATION_ROLE_INHERIT",
        });
    }

    // Prefer official Better Auth access-control semantics for organization resources.
    const organizationResources = new Set([
        "organization",
        "member",
        "invitation",
        "team",
        "ac",
    ]);
    if (organizationResources.has(resourceKey)) {
        try {
            const permissionResult = await extendedAuthApi.hasPermission({
                body: {
                    organizationId: targetMember.organizationId,
                    permissions: {
                        [resourceKey]: [actionKey],
                    },
                },
                headers: requestHeaders,
            });
            return NextResponse.json({
                hasPermission: permissionResult.success === true,
                memberId,
                appKey,
                resourceKey,
                actionKey,
                reason: "BETTER_AUTH_ORGANIZATION_PERMISSION",
            });
        } catch (error) {
            return handleApiError(error, "check organization permission");
        }
    }

    // Check cache
    const cacheKey = getCacheKey(memberId, appKey, resourceKey, actionKey);
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult !== null) {
        return NextResponse.json({
            hasPermission: cachedResult,
            memberId,
            appKey,
            resourceKey,
            actionKey,
            cached: true,
        });
    }

    try {
        // Optimized: Single query to check permission using JOINs
        const permissionCheck = await db
            .select({ roleId: memberOrganizationAppRoles.organizationAppRoleId })
            .from(memberOrganizationAppRoles)
            .innerJoin(
                organizationAppRoleAction,
                eq(memberOrganizationAppRoles.organizationAppRoleId, organizationAppRoleAction.roleId)
            )
            .innerJoin(
                actions,
                eq(organizationAppRoleAction.actionId, actions.id)
            )
            .innerJoin(
                resources,
                eq(actions.resourceId, resources.id)
            )
            .innerJoin(
                apps,
                eq(resources.appId, apps.id)
            )
            .where(
                and(
                    eq(memberOrganizationAppRoles.memberId, memberId),
                    eq(apps.key, appKey),
                    eq(resources.key, resourceKey),
                    eq(actions.key, actionKey)
                )
            )
            .limit(1);

        const hasPermission = permissionCheck.length > 0;

        // Cache the result
        setCache(cacheKey, hasPermission);

        return NextResponse.json({
            hasPermission,
            memberId,
            appKey,
            resourceKey,
            actionKey,
        });
    } catch (error) {
        return handleApiError(error, "check permission");
    }
}
