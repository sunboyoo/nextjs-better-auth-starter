import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationAppRoles, organizationAppRoleAction, actions, resources, apps } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; appId: string; organizationAppRoleId: string }>;
}

// GET /api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles/[organizationAppRoleId] - Get single role
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, organizationAppRoleId } = await params;

    try {
        // Fetch role
        const role = await db
            .select()
            .from(organizationAppRoles)
            .where(and(
                eq(organizationAppRoles.id, organizationAppRoleId),
                eq(organizationAppRoles.organizationId, organizationId),
                eq(organizationAppRoles.appId, appId)
            ))
            .limit(1);

        if (role.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        // Fetch role actions with details
        const roleActions = await db
            .select({
                actionId: organizationAppRoleAction.actionId,
                actionKey: actions.key,
                actionName: actions.name,
                resourceId: resources.id,
                resourceKey: resources.key,
                resourceName: resources.name,
                appKey: apps.key,
            })
            .from(organizationAppRoleAction)
            .innerJoin(actions, eq(organizationAppRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .innerJoin(apps, eq(organizationAppRoleAction.appId, apps.id))
            .where(eq(organizationAppRoleAction.roleId, organizationAppRoleId));

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
    const authResult = await requireAdmin();
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
            .update(organizationAppRoles)
            .set(updateData)
            .where(and(
                eq(organizationAppRoles.id, organizationAppRoleId),
                eq(organizationAppRoles.organizationId, organizationId),
                eq(organizationAppRoles.appId, appId)
            ))
            .returning();

        if (updatedRole.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        return NextResponse.json({ role: updatedRole[0] });
    } catch (error) {
        return handleApiError(error, "update organization app role");
    }
}

// DELETE /api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles/[organizationAppRoleId] - Delete role
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, organizationAppRoleId } = await params;

    try {
        // Delete role (cascade will handle role_action associations)
        const deleted = await db
            .delete(organizationAppRoles)
            .where(and(
                eq(organizationAppRoles.id, organizationAppRoleId),
                eq(organizationAppRoles.organizationId, organizationId),
                eq(organizationAppRoles.appId, appId)
            ))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete organization app role");
    }
}
