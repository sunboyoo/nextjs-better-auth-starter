import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apps, resources, actions, member } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; appId: string; resourceId: string }>;
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

async function verifyResourceOwnership(appId: string, resourceId: string, organizationId: string) {
    const result = await db
        .select({ id: resources.id })
        .from(resources)
        .innerJoin(apps, eq(resources.appId, apps.id))
        .where(
            and(
                eq(resources.id, resourceId),
                eq(resources.appId, appId),
                eq(apps.organizationId, organizationId),
            ),
        )
        .limit(1);
    return result.length > 0;
}

// GET /api/user/organizations/[organizationId]/apps/[appId]/resources/[resourceId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, resourceId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        const resource = await db
            .select({
                id: resources.id,
                appId: resources.appId,
                key: resources.key,
                name: resources.name,
                description: resources.description,
                createdAt: resources.createdAt,
                updatedAt: resources.updatedAt,
                actionCount: sql<number>`(SELECT COUNT(*) FROM ${actions} WHERE ${actions.resourceId} = ${resources.id})`,
            })
            .from(resources)
            .innerJoin(apps, eq(resources.appId, apps.id))
            .where(
                and(
                    eq(resources.id, resourceId),
                    eq(resources.appId, appId),
                    eq(apps.organizationId, organizationId),
                ),
            )
            .limit(1);

        if (resource.length === 0) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        // Get app name for breadcrumb
        const app = await db
            .select({ name: apps.name })
            .from(apps)
            .where(eq(apps.id, appId))
            .limit(1);

        return NextResponse.json({
            resource: resource[0],
            appName: app[0]?.name ?? "",
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch resource details");
    }
}

// PUT /api/user/organizations/[organizationId]/apps/[appId]/resources/[resourceId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, resourceId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can update resources" }, { status: 403 });
    }

    try {
        if (!(await verifyResourceOwnership(appId, resourceId, organizationId))) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
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
            .update(resources)
            .set(updateData)
            .where(eq(resources.id, resourceId))
            .returning();

        return NextResponse.json({ resource: updated[0] });
    } catch (error) {
        return handleApiError(error, "update resource");
    }
}

// DELETE /api/user/organizations/[organizationId]/apps/[appId]/resources/[resourceId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, resourceId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can delete resources" }, { status: 403 });
    }

    try {
        if (!(await verifyResourceOwnership(appId, resourceId, organizationId))) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        await db.delete(resources).where(eq(resources.id, resourceId));
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete resource");
    }
}
