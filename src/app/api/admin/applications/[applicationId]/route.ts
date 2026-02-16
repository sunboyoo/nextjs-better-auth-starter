import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, resources, actions, applicationRoles } from "@/db/schema";
import { withUpdatedAt } from "@/db/with-updated-at";
import { eq, count } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

// GET /api/admin/applications/[applicationId] - Get application details with stats
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId } = await params;

    try {
        const application = await db
            .select()
            .from(applications)
            .where(eq(applications.id, applicationId))
            .limit(1);

        if (application.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const resourceCountResult = await db
            .select({ count: count() })
            .from(resources)
            .where(eq(resources.applicationId, applicationId));

        const actionCountResult = await db
            .select({ count: count() })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(eq(resources.applicationId, applicationId));

        const roleCountResult = await db
            .select({ count: count() })
            .from(applicationRoles)
            .where(eq(applicationRoles.applicationId, applicationId));

        return NextResponse.json({
            application: {
                ...application[0],
                resourceCount: Number(resourceCountResult[0]?.count ?? 0),
                actionCount: Number(actionCountResult[0]?.count ?? 0),
                roleCount: Number(roleCountResult[0]?.count ?? 0),
            },
        });
    } catch (error) {
        return handleApiError(error, "fetch application");
    }
}

// PUT /api/admin/applications/[applicationId] - Update application
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId } = await params;

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

        // Check if application exists
        const existing = await db
            .select({ id: applications.id })
            .from(applications)
            .where(eq(applications.id, applicationId))
            .limit(1);

        if (existing.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const updateData: Partial<typeof applications.$inferInsert> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (logo !== undefined) updateData.logo = logo;

        const updated = await db
            .update(applications)
            .set(withUpdatedAt(updateData))
            .where(eq(applications.id, applicationId))
            .returning();

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.applications.update",
            targetType: "application",
            targetId: applicationId,
            metadata: {
                fields: Object.keys(updateData),
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ application: updated[0] });
    } catch (error) {
        return handleApiError(error, "update application");
    }
}

// DELETE /api/admin/applications/[applicationId] - Delete application
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId } = await params;

    try {
        // Check if application exists
        const existing = await db
            .select({ id: applications.id })
            .from(applications)
            .where(eq(applications.id, applicationId))
            .limit(1);

        if (existing.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        // Delete application (cascade will handle related records)
        await db.delete(applications).where(eq(applications.id, applicationId));

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.applications.delete",
            targetType: "application",
            targetId: applicationId,
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete application");
    }
}
