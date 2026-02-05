import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationAppRoles, organizationAppRoleAction, actions, resources, apps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; appId: string; organizationAppRoleId: string }>;
}

// GET /api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles/[organizationAppRoleId]/actions - Get role's assigned actions
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, organizationAppRoleId } = await params;

    try {
        const role = await db
            .select({ id: organizationAppRoles.id })
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

        const roleActions = await db
            .select({
                actionId: organizationAppRoleAction.actionId,
                actionKey: actions.key,
                actionName: actions.name,
                resourceId: resources.id,
                resourceKey: resources.key,
                resourceName: resources.name,
                appKey: apps.key,
                appName: apps.name,
            })
            .from(organizationAppRoleAction)
            .innerJoin(actions, eq(organizationAppRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .innerJoin(apps, eq(organizationAppRoleAction.appId, apps.id))
            .where(eq(organizationAppRoleAction.roleId, organizationAppRoleId));

        return NextResponse.json({
            actions: roleActions,
            actionIds: roleActions.map(ra => ra.actionId),
        });
    } catch (error) {
        return handleApiError(error, "fetch role actions");
    }
}

// PUT /api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles/[organizationAppRoleId]/actions - Replace all role actions
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, organizationAppRoleId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            actionIds: z.array(z.string().trim().min(1).max(100)),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { actionIds } = result.data;

        if (!Array.isArray(actionIds)) {
            return NextResponse.json({ error: "actionIds must be an array" }, { status: 400 });
        }

        // Verify role exists
        const role = await db
            .select({ id: organizationAppRoles.id })
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

        // Delete existing role actions
        await db
            .delete(organizationAppRoleAction)
            .where(eq(organizationAppRoleAction.roleId, organizationAppRoleId));

        // Insert new role actions
        if (actionIds.length > 0) {
            const roleActionValues = actionIds.map((actionId: string) => ({
                roleId: organizationAppRoleId,
                actionId,
                appId,
            }));

            await db.insert(organizationAppRoleAction).values(roleActionValues);
        }

        // Fetch updated actions
        const updatedActions = await db
            .select({
                actionId: organizationAppRoleAction.actionId,
                actionKey: actions.key,
                actionName: actions.name,
                resourceKey: resources.key,
                appKey: apps.key,
            })
            .from(organizationAppRoleAction)
            .innerJoin(actions, eq(organizationAppRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .innerJoin(apps, eq(organizationAppRoleAction.appId, apps.id))
            .where(eq(organizationAppRoleAction.roleId, organizationAppRoleId));

        return NextResponse.json({
            actions: updatedActions,
            actionIds: updatedActions.map(a => a.actionId),
        });
    } catch (error) {
        return handleApiError(error, "update role actions");
    }
}
