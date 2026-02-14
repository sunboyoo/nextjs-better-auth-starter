import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appRoles, appRoleAction, actions, resources, apps } from "@/db/schema";
import { withUpdatedAt } from "@/db/with-updated-at";
import { eq, sql, and } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; appId: string; organizationAppRoleId: string }>;
}

// GET /api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles/[organizationAppRoleId] - Get single role
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, organizationAppRoleId } = await params;

    try {
        // Fetch role
        const role = await db
            .select()
            .from(appRoles)
            .where(and(
                eq(appRoles.id, organizationAppRoleId),
                eq(appRoles.appId, appId)
            ))
            .limit(1);

        if (role.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        // Fetch role actions with details
        const roleActions = await db
            .select({
                actionId: appRoleAction.actionId,
                actionKey: actions.key,
                actionName: actions.name,
                resourceId: resources.id,
                resourceKey: resources.key,
                resourceName: resources.name,
                appKey: apps.key,
            })
            .from(appRoleAction)
            .innerJoin(actions, eq(appRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .innerJoin(apps, eq(resources.appId, apps.id))
            .where(eq(appRoleAction.roleId, organizationAppRoleId));

        return NextResponse.json({
            role: {
                ...role[0],
                actions: roleActions,
                appResourceActions: roleActions.map(ra => `${ra.appKey}:${ra.resourceKey}:${ra.actionKey}`),
            },
        });
    } catch (error) {
        return handleApiError(error, "fetch organization app role");
    }
}

// PUT /api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles/[organizationAppRoleId] - Update role
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, organizationAppRoleId } = await params;

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
            .update(appRoles)
            .set(withUpdatedAt(updateData))
            .where(and(
                eq(appRoles.id, organizationAppRoleId),
                eq(appRoles.appId, appId)
            ))
            .returning();

        if (updatedRole.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.app-roles.update",
            targetType: "rbac",
            targetId: organizationAppRoleId,
            metadata: {
                organizationId,
                appId,
                fields: Object.keys(updateData),
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ role: updatedRole[0] });
    } catch (error) {
        return handleApiError(error, "update organization app role");
    }
}

// DELETE /api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles/[organizationAppRoleId] - Delete role
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, organizationAppRoleId } = await params;

    try {
        // Delete role (cascade will handle role_action associations)
        const deleted = await db
            .delete(appRoles)
            .where(and(
                eq(appRoles.id, organizationAppRoleId),
                eq(appRoles.appId, appId)
            ))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.app-roles.delete",
            targetType: "rbac",
            targetId: organizationAppRoleId,
            metadata: {
                organizationId,
                appId,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete organization app role");
    }
}
