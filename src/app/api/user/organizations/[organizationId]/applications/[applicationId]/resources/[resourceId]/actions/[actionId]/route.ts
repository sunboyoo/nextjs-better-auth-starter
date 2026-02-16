import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apps, resources, actions, member } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; appId: string; resourceId: string; actionId: string }>;
}

async function verifyOrgMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
        .limit(1);
    return memberRecord[0] ?? null;
}

function isWriteRole(role: string): boolean {
    return role === "owner" || role === "admin";
}

async function verifyActionOwnership(
    appId: string,
    resourceId: string,
    actionId: string,
    organizationId: string,
) {
    const result = await db
        .select({ id: actions.id })
        .from(actions)
        .innerJoin(resources, eq(actions.resourceId, resources.id))
        .innerJoin(apps, eq(resources.appId, apps.id))
        .where(
            and(
                eq(actions.id, actionId),
                eq(actions.resourceId, resourceId),
                eq(resources.appId, appId),
                eq(apps.organizationId, organizationId),
            ),
        )
        .limit(1);
    return result.length > 0;
}

// GET /api/user/organizations/[organizationId]/apps/[appId]/resources/[resourceId]/actions/[actionId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, resourceId, actionId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        const action = await db
            .select({
                id: actions.id,
                resourceId: actions.resourceId,
                key: actions.key,
                name: actions.name,
                description: actions.description,
                createdAt: actions.createdAt,
                updatedAt: actions.updatedAt,
            })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .innerJoin(apps, eq(resources.appId, apps.id))
            .where(
                and(
                    eq(actions.id, actionId),
                    eq(actions.resourceId, resourceId),
                    eq(resources.appId, appId),
                    eq(apps.organizationId, organizationId),
                ),
            )
            .limit(1);

        if (action.length === 0) {
            return NextResponse.json({ error: "Action not found" }, { status: 404 });
        }

        // Get resource name for breadcrumb
        const resource = await db
            .select({ name: resources.name, key: resources.key })
            .from(resources)
            .where(eq(resources.id, resourceId))
            .limit(1);

        // Get app name for breadcrumb
        const app = await db
            .select({ name: apps.name })
            .from(apps)
            .where(eq(apps.id, appId))
            .limit(1);

        return NextResponse.json({
            action: action[0],
            resourceName: resource[0]?.name ?? "",
            resourceKey: resource[0]?.key ?? "",
            appName: app[0]?.name ?? "",
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch action details");
    }
}

// PUT /api/user/organizations/[organizationId]/apps/[appId]/resources/[resourceId]/actions/[actionId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, resourceId, actionId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can update actions" }, { status: 403 });
    }

    try {
        if (!(await verifyActionOwnership(appId, resourceId, actionId, organizationId))) {
            return NextResponse.json({ error: "Action not found" }, { status: 404 });
        }

        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100).optional(),
            description: z.string().trim().max(1000).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (result.data.name !== undefined) updateData.name = result.data.name;
        if (result.data.description !== undefined) updateData.description = result.data.description;

        const updated = await db
            .update(actions)
            .set(updateData)
            .where(eq(actions.id, actionId))
            .returning();

        return NextResponse.json({ action: updated[0] });
    } catch (error) {
        return handleApiError(error, "update action");
    }
}

// DELETE /api/user/organizations/[organizationId]/apps/[appId]/resources/[resourceId]/actions/[actionId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, resourceId, actionId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can delete actions" }, { status: 403 });
    }

    try {
        if (!(await verifyActionOwnership(appId, resourceId, actionId, organizationId))) {
            return NextResponse.json({ error: "Action not found" }, { status: 404 });
        }

        await db.delete(actions).where(eq(actions.id, actionId));
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete action");
    }
}
