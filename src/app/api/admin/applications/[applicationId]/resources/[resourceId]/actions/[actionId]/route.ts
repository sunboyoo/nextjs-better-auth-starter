import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { actions, resources } from "@/db/schema";
import { withUpdatedAt } from "@/db/with-updated-at";
import { eq, and } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

// GET /api/admin/applications/[applicationId]/resources/[resourceId]/actions/[actionId] - Get action details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string; resourceId: string; actionId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId, resourceId, actionId } = await params;

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
                resourceName: resources.name,
                resourceKey: resources.key,
            })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(
                and(
                    eq(actions.id, actionId),
                    eq(actions.resourceId, resourceId),
                    eq(resources.applicationId, applicationId),
                ),
            )
            .limit(1);

        if (action.length === 0) {
            return NextResponse.json({ error: "Action not found" }, { status: 404 });
        }

        return NextResponse.json({ action: action[0] });
    } catch (error) {
        return handleApiError(error, "fetch action");
    }
}

// PUT /api/admin/applications/[applicationId]/resources/[resourceId]/actions/[actionId] - Update action
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string; resourceId: string; actionId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId, resourceId, actionId } = await params;

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
            .select({ id: actions.id })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(
                and(
                    eq(actions.id, actionId),
                    eq(actions.resourceId, resourceId),
                    eq(resources.applicationId, applicationId),
                ),
            )
            .limit(1);

        if (existing.length === 0) {
            return NextResponse.json({ error: "Action not found" }, { status: 404 });
        }

        const updateData: Partial<typeof actions.$inferInsert> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const updated = await db
            .update(actions)
            .set(withUpdatedAt(updateData))
            .where(
                and(
                    eq(actions.id, actionId),
                    eq(actions.resourceId, resourceId),
                ),
            )
            .returning();

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.applications.actions.update",
            targetType: "action",
            targetId: actionId,
            metadata: {
                fields: Object.keys(updateData),
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ action: updated[0] });
    } catch (error) {
        return handleApiError(error, "update action");
    }
}

// DELETE /api/admin/applications/[applicationId]/resources/[resourceId]/actions/[actionId] - Delete action
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string; resourceId: string; actionId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId, resourceId, actionId } = await params;

    try {
        const existing = await db
            .select({ id: actions.id })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(
                and(
                    eq(actions.id, actionId),
                    eq(actions.resourceId, resourceId),
                    eq(resources.applicationId, applicationId),
                ),
            )
            .limit(1);

        if (existing.length === 0) {
            return NextResponse.json({ error: "Action not found" }, { status: 404 });
        }

        await db
            .delete(actions)
            .where(
                and(
                    eq(actions.id, actionId),
                    eq(actions.resourceId, resourceId),
                ),
            );

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.applications.actions.delete",
            targetType: "action",
            targetId: actionId,
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete action");
    }
}
