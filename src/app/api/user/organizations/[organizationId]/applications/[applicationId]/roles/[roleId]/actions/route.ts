import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
    actions,
    applicationRoleAction,
    applicationRoles,
    applications,
    member,
    resources,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{
        organizationId: string;
        applicationId: string;
        roleId: string;
    }>;
}

async function verifyOrganizationMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(
            and(
                eq(member.userId, userId),
                eq(member.organizationId, organizationId),
            ),
        )
        .limit(1);

    return memberRecord[0] ?? null;
}

function isWriteRole(role: string): boolean {
    return role === "owner" || role === "admin";
}

async function verifyApplicationOwnership(applicationId: string, organizationId: string) {
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

async function verifyRoleOwnership(roleId: string, applicationId: string) {
    const role = await db
        .select({ id: applicationRoles.id })
        .from(applicationRoles)
        .where(
            and(
                eq(applicationRoles.id, roleId),
                eq(applicationRoles.applicationId, applicationId),
            ),
        )
        .limit(1);

    return role.length > 0;
}

async function validateActionIdsBelongToApplication(
    applicationId: string,
    actionIds: string[],
) {
    if (actionIds.length === 0) return true;

    const uniqueActionIds = Array.from(new Set(actionIds));
    const validActions = await db
        .select({ id: actions.id })
        .from(actions)
        .innerJoin(resources, eq(actions.resourceId, resources.id))
        .where(
            and(
                inArray(actions.id, uniqueActionIds),
                eq(resources.applicationId, applicationId),
            ),
        );

    return validActions.length === uniqueActionIds.length;
}

// GET /api/user/organizations/[organizationId]/applications/[applicationId]/roles/[roleId]/actions
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, roleId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);

    if (!membership) {
        return NextResponse.json(
            { error: "Not a member of this organization" },
            { status: 403 },
        );
    }

    try {
        const isOwnedApplication = await verifyApplicationOwnership(applicationId, organizationId);
        if (!isOwnedApplication) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const isOwnedRole = await verifyRoleOwnership(roleId, applicationId);
        if (!isOwnedRole) {
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
            })
            .from(applicationRoleAction)
            .innerJoin(actions, eq(applicationRoleAction.actionId, actions.id))
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(
                and(
                    eq(applicationRoleAction.roleId, roleId),
                    eq(resources.applicationId, applicationId),
                ),
            );

        return NextResponse.json({
            actions: roleActions,
            actionIds: roleActions.map((item) => item.actionId),
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch application role actions");
    }
}

// PUT /api/user/organizations/[organizationId]/applications/[applicationId]/roles/[roleId]/actions
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, roleId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);

    if (!membership) {
        return NextResponse.json(
            { error: "Not a member of this organization" },
            { status: 403 },
        );
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json(
            { error: "Only owner or admin can manage application roles" },
            { status: 403 },
        );
    }

    try {
        const isOwnedApplication = await verifyApplicationOwnership(applicationId, organizationId);
        if (!isOwnedApplication) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const isOwnedRole = await verifyRoleOwnership(roleId, applicationId);
        if (!isOwnedRole) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        const body = await request.json();
        const schema = z.object({
            actionIds: z.array(z.string().trim().min(1).max(100)),
        });
        const result = schema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const uniqueActionIds = Array.from(new Set(result.data.actionIds));
        const areActionIdsValid = await validateActionIdsBelongToApplication(
            applicationId,
            uniqueActionIds,
        );
        if (!areActionIdsValid) {
            return NextResponse.json(
                { error: "One or more actionIds do not belong to this application" },
                { status: 400 },
            );
        }

        await db
            .delete(applicationRoleAction)
            .where(eq(applicationRoleAction.roleId, roleId));

        if (uniqueActionIds.length > 0) {
            await db.insert(applicationRoleAction).values(
                uniqueActionIds.map((actionId) => ({
                    roleId,
                    actionId,
                })),
            );
        }

        return NextResponse.json({ actionIds: uniqueActionIds });
    } catch (error) {
        return handleApiError(error, "update application role actions");
    }
}
