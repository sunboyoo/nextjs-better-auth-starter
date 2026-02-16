import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { resources, actions } from "@/db/schema";
import { withUpdatedAt } from "@/db/with-updated-at";
import { eq, count } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

// GET /api/admin/applications/[applicationId]/resources/[resourceId] - Get resource details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string; resourceId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { resourceId } = await params;

    try {
        const resource = await db
            .select({
                id: resources.id,
                applicationId: resources.applicationId,
                key: resources.key,
                name: resources.name,
                description: resources.description,
                createdAt: resources.createdAt,
                updatedAt: resources.updatedAt,
            })
            .from(resources)
            .where(eq(resources.id, resourceId))
            .limit(1);

        if (resource.length === 0) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        const actionCountResult = await db
            .select({ count: count() })
            .from(actions)
            .where(eq(actions.resourceId, resourceId));

        return NextResponse.json({
            resource: {
                ...resource[0],
                actionCount: Number(actionCountResult[0]?.count ?? 0),
            },
        });
    } catch (error) {
        return handleApiError(error, "fetch resource");
    }
}

// PUT /api/admin/applications/[applicationId]/resources/[resourceId] - Update resource
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string; resourceId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { resourceId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100).optional(),
            description: z.string().trim().max(1000).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { name, description } = result.data;

        const existing = await db
            .select({ id: resources.id })
            .from(resources)
            .where(eq(resources.id, resourceId))
            .limit(1);

        if (existing.length === 0) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        const updateData: Partial<typeof resources.$inferInsert> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const updated = await db
            .update(resources)
            .set(withUpdatedAt(updateData))
            .where(eq(resources.id, resourceId))
            .returning();

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.applications.resources.update",
            targetType: "resource",
            targetId: resourceId,
            metadata: {
                fields: Object.keys(updateData),
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ resource: updated[0] });
    } catch (error) {
        return handleApiError(error, "update resource");
    }
}

// DELETE /api/admin/applications/[applicationId]/resources/[resourceId] - Delete resource
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string; resourceId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { resourceId } = await params;

    try {
        const existing = await db
            .select({ id: resources.id })
            .from(resources)
            .where(eq(resources.id, resourceId))
            .limit(1);

        if (existing.length === 0) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        await db.delete(resources).where(eq(resources.id, resourceId));

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.applications.resources.delete",
            targetType: "resource",
            targetId: resourceId,
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete resource");
    }
}
