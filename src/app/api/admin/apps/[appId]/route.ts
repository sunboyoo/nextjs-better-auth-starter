import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apps, resources, actions, organizationAppRoles } from "@/db/schema";
import { withUpdatedAt } from "@/db/with-updated-at";
import { eq, sql } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

// GET /api/admin/apps/[appId] - Get app details with stats
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ appId: string }> }
) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { appId } = await params;

    try {
        const app = await db
            .select({
                id: apps.id,
                key: apps.key,
                name: apps.name,
                description: apps.description,
                logo: apps.logo,
                isActive: apps.isActive,
                createdAt: apps.createdAt,
                updatedAt: apps.updatedAt,
                resourceCount: sql<number>`(SELECT COUNT(*) FROM ${resources} WHERE ${resources.appId} = ${apps.id})`,
                actionCount: sql<number>`(SELECT COUNT(*) FROM ${actions} WHERE ${actions.appId} = ${apps.id})`,
                roleCount: sql<number>`(SELECT COUNT(*) FROM ${organizationAppRoles} WHERE ${organizationAppRoles.appId} = ${apps.id})`,
            })
            .from(apps)
            .where(eq(apps.id, appId))
            .limit(1);

        if (app.length === 0) {
            return NextResponse.json({ error: "App not found" }, { status: 404 });
        }

        return NextResponse.json({ app: app[0] });
    } catch (error) {
        return handleApiError(error, "fetch app");
    }
}

// PUT /api/admin/apps/[appId] - Update app
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ appId: string }> }
) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { appId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100).optional(),
            description: z.string().trim().max(1000).optional().nullable(),
            isActive: z.boolean().optional(),
            logo: z.string().trim().max(500).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { name, description, isActive, logo } = result.data;

        // Check if app exists
        const existing = await db
            .select({ id: apps.id })
            .from(apps)
            .where(eq(apps.id, appId))
            .limit(1);

        if (existing.length === 0) {
            return NextResponse.json({ error: "App not found" }, { status: 404 });
        }

        const updateData: Partial<typeof apps.$inferInsert> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (logo !== undefined) updateData.logo = logo;

        const updated = await db
            .update(apps)
            .set(withUpdatedAt(updateData))
            .where(eq(apps.id, appId))
            .returning();

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.apps.update",
            targetType: "app",
            targetId: appId,
            metadata: {
                fields: Object.keys(updateData),
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ app: updated[0] });
    } catch (error) {
        return handleApiError(error, "update app");
    }
}

// DELETE /api/admin/apps/[appId] - Delete app
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ appId: string }> }
) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { appId } = await params;

    try {
        // Check if app exists
        const existing = await db
            .select({ id: apps.id })
            .from(apps)
            .where(eq(apps.id, appId))
            .limit(1);

        if (existing.length === 0) {
            return NextResponse.json({ error: "App not found" }, { status: 404 });
        }

        // Delete app (cascade will handle related records)
        await db.delete(apps).where(eq(apps.id, appId));

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.apps.delete",
            targetType: "app",
            targetId: appId,
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete app");
    }
}
