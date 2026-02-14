import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appRoles, appRoleAction, actions, resources, apps, organization } from "@/db/schema";
import { eq, and, ilike, desc, sql, count } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; appId: string }>;
}

// GET /api/admin/organizations/[organizationId]/apps/[appId]/roles - List roles
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, appId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const isActiveParam = searchParams.get("isActive");
    const pagination = parsePagination(request);

    try {
        // Build filter conditions — organizationId is verified through app ownership
        const conditions = [
            eq(appRoles.appId, appId),
        ];
        if (search) conditions.push(ilike(appRoles.name, `%${search}%`));
        if (isActiveParam !== null && isActiveParam !== undefined) {
            conditions.push(eq(appRoles.isActive, isActiveParam === "true"));
        }

        const whereConditions = and(...conditions);

        // Fetch roles with app info
        const rolesList = await db
            .select({
                id: appRoles.id,
                appId: appRoles.appId,
                key: appRoles.key,
                name: appRoles.name,
                description: appRoles.description,
                isActive: appRoles.isActive,
                createdAt: appRoles.createdAt,
                updatedAt: appRoles.updatedAt,
                organizationName: organization.name,
                appName: apps.name,
                appKey: apps.key,
            })
            .from(appRoles)
            .leftJoin(apps, eq(appRoles.appId, apps.id))
            .leftJoin(organization, eq(apps.organizationId, organization.id))
            .where(whereConditions)
            .orderBy(desc(appRoles.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        // Get action counts for each role
        const actionCounts = await db
            .select({
                roleId: appRoleAction.roleId,
                count: count(),
            })
            .from(appRoleAction)
            .groupBy(appRoleAction.roleId);

        const actionCountMap = new Map(actionCounts.map(a => [a.roleId, Number(a.count)]));

        // Fetch role actions with resource and action details
        const roleIds = rolesList.map(r => r.id);
        let roleActionsMap = new Map<string, string[]>();

        if (roleIds.length > 0) {
            const roleActions = await db
                .select({
                    roleId: appRoleAction.roleId,
                    actionKey: actions.key,
                    resourceKey: resources.key,
                    appKey: apps.key,
                })
                .from(appRoleAction)
                .innerJoin(actions, eq(appRoleAction.actionId, actions.id))
                .innerJoin(resources, eq(actions.resourceId, resources.id))
                .innerJoin(apps, eq(resources.appId, apps.id))
                .where(sql`${appRoleAction.roleId} IN (${sql.join(roleIds.map(id => sql`${id}::uuid`), sql`, `)})`);

            // Group actions by role ID
            roleActions.forEach(ra => {
                const key = `${ra.appKey}:${ra.resourceKey}:${ra.actionKey}`;
                if (!roleActionsMap.has(ra.roleId)) {
                    roleActionsMap.set(ra.roleId, []);
                }
                roleActionsMap.get(ra.roleId)!.push(key);
            });
        }

        // Merge data
        const rolesWithData = rolesList.map(role => ({
            ...role,
            actionCount: actionCountMap.get(role.id) || 0,
            appResourceActions: roleActionsMap.get(role.id) || [],
        }));

        // Get total count
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(appRoles)
            .where(whereConditions);

        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            roles: rolesWithData,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch organization app roles");
    }
}

// POST /api/admin/organizations/[organizationId]/apps/[appId]/roles - Create a new role
export async function POST(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, appId } = await params;

    try {
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

        if (!key || !name) {
            return NextResponse.json(
                { error: "key and name are required" },
                { status: 400 }
            );
        }

        // Validate key format
        const keyRegex = /^[a-z0-9]+(_[a-z0-9]+)*$/;
        if (!keyRegex.test(key)) {
            return NextResponse.json(
                { error: "Key must be lowercase letters/numbers with underscores (e.g., order_reviewer)" },
                { status: 400 }
            );
        }

        // Check if key already exists for this app
        const existing = await db
            .select({ id: appRoles.id })
            .from(appRoles)
            .where(and(
                eq(appRoles.appId, appId),
                eq(appRoles.key, key)
            ))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "Role with this key already exists for this app" },
                { status: 400 }
            );
        }

        // Create the role
        const newRole = await db
            .insert(appRoles)
            .values({
                appId,
                key,
                name,
                description: description || null,
                isActive,
            })
            .returning();

        // If actionIds provided, create role-action associations
        if (actionIds.length > 0) {
            const roleActionValues = actionIds.map((actionId: string) => ({
                roleId: newRole[0].id,
                actionId,
            }));

            await db.insert(appRoleAction).values(roleActionValues);
        }

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.app-roles.create",
            targetType: "rbac",
            targetId: newRole[0]?.id ?? null,
            metadata: {
                organizationId,
                appId,
                key,
                name,
                actionIds,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ role: newRole[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create organization app role");
    }
}
