import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applicationRoles, applicationRoleAction, actions, resources, applications } from "@/db/schema";
import { withUpdatedAt } from "@/db/with-updated-at";
import { eq, sql, and } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; applicationId: string; organizationApplicationRoleId: string }>;
}

// GET /api/admin/organizations/[organizationId]/applications/[applicationId]/organization-application-roles/[organizationApplicationRoleId] - Get single role
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, organizationApplicationRoleId } = await params;

    try {
        // Fetch role
        const role = await db
            .select()
            .from(applicationRoles)
            .where(and(
                eq(applicationRoles.id, organizationApplicationRoleId),
                eq(applicationRoles.applicationId, applicationId)
            ))
            .limit(1);

        if (role.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        // Fetch role actions with details
        const roleActions = await db
            .select({
                actionId: applicationRoleAction.actionId,
                actionKey: actions.key,
                actionName: actions.name,
                resourceId: resources.id,
                resourceKey: resources.key,
                resourceName: resources.name,
                applicationKey: applications.key,
            })
            .from(applicationRoleAction)
            .innerJoin(actions, eq(applicationRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .innerJoin(applications, eq(resources.applicationId, applications.id))
            .where(eq(applicationRoleAction.roleId, organizationApplicationRoleId));

        return NextResponse.json({
            role: {
                ...role[0],
                actions: roleActions,
                applicationResourceActions: roleActions.map(ra => `${ra.applicationKey}:${ra.resourceKey}:${ra.actionKey}`),
            },
        });
    } catch (error) {
        return handleApiError(error, "fetch organization application role");
    }
}

// PUT /api/admin/organizations/[organizationId]/applications/[applicationId]/organization-application-roles/[organizationApplicationRoleId] - Update role
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, organizationApplicationRoleId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100).optional(),
            description: z.string().trim().max(1000).optional().nullable(),
            isActive: z.boolean().optional(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { name, description, isActive } = result.data;

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No update data provided" }, { status: 400 });
        }

        const updatedRole = await db
            .update(applicationRoles)
            .set(withUpdatedAt(updateData))
            .where(and(
                eq(applicationRoles.id, organizationApplicationRoleId),
                eq(applicationRoles.applicationId, applicationId)
            ))
            .returning();

        if (updatedRole.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.application-roles.update",
            targetType: "rbac",
            targetId: organizationApplicationRoleId,
            metadata: {
                organizationId,
                applicationId,
                fields: Object.keys(updateData),
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ role: updatedRole[0] });
    } catch (error) {
        return handleApiError(error, "update organization application role");
    }
}

// DELETE /api/admin/organizations/[organizationId]/applications/[applicationId]/organization-application-roles/[organizationApplicationRoleId] - Delete role
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, organizationApplicationRoleId } = await params;

    try {
        // Delete role (cascade will handle role_action associations)
        const deleted = await db
            .delete(applicationRoles)
            .where(and(
                eq(applicationRoles.id, organizationApplicationRoleId),
                eq(applicationRoles.applicationId, applicationId)
            ))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.application-roles.delete",
            targetType: "rbac",
            targetId: organizationApplicationRoleId,
            metadata: {
                organizationId,
                applicationId,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete organization application role");
    }
}
