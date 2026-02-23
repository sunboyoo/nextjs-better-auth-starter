import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applicationRoles, applicationRoleAction, actions, resources, applications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; applicationId: string; organizationApplicationRoleId: string }>;
}

async function verifyApplicationOwnership(
    organizationId: string,
    applicationId: string,
): Promise<boolean> {
    const application = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
            and(
                eq(applications.id, applicationId),
                eq(applications.organizationId, organizationId),
            ),
        )
        .limit(1);
    return application.length > 0;
}

// GET /api/admin/organizations/[organizationId]/applications/[applicationId]/organization-application-roles/[organizationApplicationRoleId]/actions - Get role's assigned actions
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, organizationApplicationRoleId } = await params;

    try {
        const applicationExists = await verifyApplicationOwnership(
            organizationId,
            applicationId,
        );
        if (!applicationExists) {
            return NextResponse.json(
                { error: "Application not found in this organization" },
                { status: 404 },
            );
        }

        const role = await db
            .select({ id: applicationRoles.id })
            .from(applicationRoles)
            .where(and(
                eq(applicationRoles.id, organizationApplicationRoleId),
                eq(applicationRoles.applicationId, applicationId)
            ))
            .limit(1);

        if (role.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        const roleActions = await db
            .select({
                actionId: applicationRoleAction.actionId,
                actionKey: actions.key,
                actionName: actions.name,
                resourceId: resources.id,
                resourceKey: resources.key,
                resourceName: resources.name,
                applicationKey: applications.key,
                applicationName: applications.name,
            })
            .from(applicationRoleAction)
            .innerJoin(actions, eq(applicationRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .innerJoin(applications, eq(resources.applicationId, applications.id))
            .where(eq(applicationRoleAction.roleId, organizationApplicationRoleId));

        return NextResponse.json({
            actions: roleActions,
            actionIds: roleActions.map(ra => ra.actionId),
        });
    } catch (error) {
        return handleApiError(error, "fetch role actions");
    }
}

// PUT /api/admin/organizations/[organizationId]/applications/[applicationId]/organization-application-roles/[organizationApplicationRoleId]/actions - Replace all role actions
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, organizationApplicationRoleId } = await params;

    try {
        const applicationExists = await verifyApplicationOwnership(
            organizationId,
            applicationId,
        );
        if (!applicationExists) {
            return NextResponse.json(
                { error: "Application not found in this organization" },
                { status: 404 },
            );
        }

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
            .select({ id: applicationRoles.id })
            .from(applicationRoles)
            .where(and(
                eq(applicationRoles.id, organizationApplicationRoleId),
                eq(applicationRoles.applicationId, applicationId)
            ))
            .limit(1);

        if (role.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        // Delete existing role actions
        await db
            .delete(applicationRoleAction)
            .where(eq(applicationRoleAction.roleId, organizationApplicationRoleId));

        // Insert new role actions
        if (actionIds.length > 0) {
            const roleActionValues = actionIds.map((actionId: string) => ({
                roleId: organizationApplicationRoleId,
                actionId,
            }));

            await db.insert(applicationRoleAction).values(roleActionValues);
        }

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.application-roles.actions.replace",
            targetType: "rbac",
            targetId: organizationApplicationRoleId,
            metadata: {
                organizationId,
                applicationId,
                actionCount: actionIds.length,
                actionIds,
            },
            headers: authResult.headers,
        });

        // Fetch updated actions
        const updatedActions = await db
            .select({
                actionId: applicationRoleAction.actionId,
                actionKey: actions.key,
                actionName: actions.name,
                resourceKey: resources.key,
                applicationKey: applications.key,
            })
            .from(applicationRoleAction)
            .innerJoin(actions, eq(applicationRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .innerJoin(applications, eq(resources.applicationId, applications.id))
            .where(eq(applicationRoleAction.roleId, organizationApplicationRoleId));

        return NextResponse.json({
            actions: updatedActions,
            actionIds: updatedActions.map(a => a.actionId),
        });
    } catch (error) {
        return handleApiError(error, "update role actions");
    }
}
