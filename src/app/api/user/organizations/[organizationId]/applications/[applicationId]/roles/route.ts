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
import { and, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; applicationId: string }>;
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
        .select({ id: applications.id, name: applications.name, key: applications.key })
        .from(applications)
        .where(
            and(
                eq(applications.id, applicationId),
                eq(applications.organizationId, organizationId),
            ),
        )
        .limit(1);

    return application[0] ?? null;
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

// GET /api/user/organizations/[organizationId]/applications/[applicationId]/roles
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json(
            { error: "Not a member of this organization" },
            { status: 403 },
        );
    }

    try {
        const application = await verifyApplicationOwnership(applicationId, organizationId);
        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get("search")?.trim() ?? "";
        const isActiveParam = searchParams.get("isActive");

        const conditions = [eq(applicationRoles.applicationId, applicationId)];
        if (search) {
            conditions.push(ilike(applicationRoles.name, `%${search}%`));
        }
        if (isActiveParam !== null && isActiveParam !== undefined) {
            conditions.push(eq(applicationRoles.isActive, isActiveParam === "true"));
        }

        const whereConditions = and(...conditions);

        const rolesList = await db
            .select({
                id: applicationRoles.id,
                applicationId: applicationRoles.applicationId,
                key: applicationRoles.key,
                name: applicationRoles.name,
                description: applicationRoles.description,
                isActive: applicationRoles.isActive,
                createdAt: applicationRoles.createdAt,
                updatedAt: applicationRoles.updatedAt,
            })
            .from(applicationRoles)
            .where(whereConditions)
            .orderBy(desc(applicationRoles.createdAt));

        const actionCounts = await db
            .select({
                roleId: applicationRoleAction.roleId,
                count: count(),
            })
            .from(applicationRoleAction)
            .groupBy(applicationRoleAction.roleId);

        const actionCountMap = new Map(actionCounts.map((row) => [row.roleId, Number(row.count)]));

        const roleIds = rolesList.map((role) => role.id);
        const roleActionsMap = new Map<string, string[]>();

        if (roleIds.length > 0) {
            const roleActions = await db
                .select({
                    roleId: applicationRoleAction.roleId,
                    resourceKey: resources.key,
                    actionKey: actions.key,
                })
                .from(applicationRoleAction)
                .innerJoin(actions, eq(applicationRoleAction.actionId, actions.id))
                .innerJoin(resources, eq(actions.resourceId, resources.id))
                .where(
                    and(
                        inArray(applicationRoleAction.roleId, roleIds),
                        eq(resources.applicationId, applicationId),
                    ),
                );

            for (const roleAction of roleActions) {
                const formatted = `${application.key}:${roleAction.resourceKey}:${roleAction.actionKey}`;
                const current = roleActionsMap.get(roleAction.roleId) ?? [];
                current.push(formatted);
                roleActionsMap.set(roleAction.roleId, current);
            }
        }

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(applicationRoles)
            .where(whereConditions);

        const rolesWithAssignments = rolesList.map((role) => ({
            ...role,
            actionCount: actionCountMap.get(role.id) ?? 0,
            applicationResourceActions: roleActionsMap.get(role.id) ?? [],
        }));

        return NextResponse.json({
            application,
            roles: rolesWithAssignments,
            total: Number(countResult[0]?.count ?? 0),
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch application roles");
    }
}

// POST /api/user/organizations/[organizationId]/applications/[applicationId]/roles
export async function POST(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId } = await params;
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
        const application = await verifyApplicationOwnership(applicationId, organizationId);
        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const body = await request.json();
        const schema = z.object({
            key: z.string().trim().min(1).max(50),
            name: z.string().trim().min(1).max(100),
            description: z.string().trim().max(1000).optional().nullable(),
            isActive: z.boolean().optional(),
            actionIds: z.array(z.string().trim().min(1).max(100)).optional(),
        });
        const result = schema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const {
            key,
            name,
            description,
            isActive = true,
            actionIds = [],
        } = result.data;

        const keyRegex = /^[a-z0-9]+(_[a-z0-9]+)*$/;
        if (!keyRegex.test(key)) {
            return NextResponse.json(
                { error: "Key must be lowercase letters/numbers with underscores" },
                { status: 400 },
            );
        }

        const existingRole = await db
            .select({ id: applicationRoles.id })
            .from(applicationRoles)
            .where(
                and(
                    eq(applicationRoles.applicationId, applicationId),
                    eq(applicationRoles.key, key),
                ),
            )
            .limit(1);

        if (existingRole.length > 0) {
            return NextResponse.json(
                { error: "Role with this key already exists for this application" },
                { status: 400 },
            );
        }

        const uniqueActionIds = Array.from(new Set(actionIds));
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

        const newRole = await db
            .insert(applicationRoles)
            .values({
                applicationId,
                key,
                name,
                description: description ?? null,
                isActive,
            })
            .returning();

        if (uniqueActionIds.length > 0) {
            await db.insert(applicationRoleAction).values(
                uniqueActionIds.map((actionId) => ({
                    roleId: newRole[0].id,
                    actionId,
                })),
            );
        }

        return NextResponse.json({ role: newRole[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create application role");
    }
}
