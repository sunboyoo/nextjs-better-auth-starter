import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberOrganizationAppRoles, organizationAppRoleAction, organizationAppRoles, actions, resources, apps, member } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { handleApiError } from "@/lib/api/error-handler";

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
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Authorization check: only admin or the member themselves can check permissions
    if (session.user.role !== "admin") {
        // Check if the current user owns this member record
        const memberRecord = await db
            .select({ userId: member.userId })
            .from(member)
            .where(eq(member.id, memberId))
            .limit(1);

        if (memberRecord.length === 0 || memberRecord[0].userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden: Cannot check other members' permissions" }, { status: 403 });
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
