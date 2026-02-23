import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { actions, resources, applications } from "@/db/schema";
import { eq, and, ilike, desc, sql, inArray } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

// GET /api/admin/applications/[applicationId]/resources/[resourceId]/actions - List actions by resourceId
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string; resourceId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId, resourceId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const pagination = parsePagination(request);

    try {
        // Verify resource exists
        const resource = await db
            .select({ id: resources.id, name: resources.name, applicationId: resources.applicationId })
            .from(resources)
            .where(
                and(
                    eq(resources.id, resourceId),
                    eq(resources.applicationId, applicationId),
                ),
            )
            .limit(1);

        if (resource.length === 0) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        const conditions = search
            ? and(eq(actions.resourceId, resourceId), ilike(actions.name, `%${search}%`))
            : eq(actions.resourceId, resourceId);

        // Fetch actions
        const actionsList = await db
            .select()
            .from(actions)
            .where(conditions)
            .orderBy(desc(actions.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        // Get resource info (name and key) for all unique resource IDs
        const resourceIds = [...new Set(actionsList.map(a => a.resourceId))];
        const resourceInfoList = resourceIds.length > 0
            ? await db
                .select({ id: resources.id, name: resources.name, key: resources.key, applicationId: resources.applicationId })
                .from(resources)
                .where(inArray(resources.id, resourceIds))
            : [];

        // Create resource lookup map
        const resourceInfoMap = new Map(resourceInfoList.map(r => [r.id, { name: r.name, key: r.key, applicationId: r.applicationId }]));

        // Get application info (key) for all unique application IDs
        const applicationIds = [...new Set(resourceInfoList.map(r => r.applicationId))];
        const applicationInfoList = applicationIds.length > 0
            ? await db
                .select({ id: applications.id, key: applications.key })
                .from(applications)
                .where(inArray(applications.id, applicationIds))
            : [];

        // Create application lookup map
        const applicationKeyMap = new Map(applicationInfoList.map(a => [a.id, a.key]));

        // Merge resource and application info into actions
        const actionsWithKeys = actionsList.map(action => {
            const resourceInfo = resourceInfoMap.get(action.resourceId);
            const applicationKey = resourceInfo?.applicationId ? applicationKeyMap.get(resourceInfo.applicationId) : undefined;
            return {
                ...action,
                resourceName: resourceInfo?.name || null,
                resourceKey: resourceInfo?.key || null,
                applicationKey: applicationKey || null,
            };
        });

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(actions)
            .where(conditions);

        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            resource: resource[0],
            actions: actionsWithKeys,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch actions");
    }
}

// POST /api/admin/applications/[applicationId]/resources/[resourceId]/actions - Create a new action
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string; resourceId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId, resourceId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            key: z.string().trim().min(1).max(50),
            name: z.string().trim().min(1).max(100),
            description: z.string().trim().max(1000).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { key, name, description } = result.data;

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
                { error: "Key must be lowercase letters/numbers with underscores" },
                { status: 400 }
            );
        }

        // Verify resource exists
        const resource = await db
            .select({ id: resources.id, applicationId: resources.applicationId })
            .from(resources)
            .where(
                and(
                    eq(resources.id, resourceId),
                    eq(resources.applicationId, applicationId),
                ),
            )
            .limit(1);

        if (resource.length === 0) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        // Check if action key already exists for this resource
        const existing = await db
            .select({ id: actions.id })
            .from(actions)
            .where(and(eq(actions.resourceId, resourceId), eq(actions.key, key)))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "Action with this key already exists for this resource" },
                { status: 400 }
            );
        }

        const newAction = await db
            .insert(actions)
            .values({
                resourceId,
                key,
                name,
                description: description || null,
            })
            .returning();

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.applications.actions.create",
            targetType: "action",
            targetId: newAction[0]?.id ?? null,
            metadata: {
                applicationId: resource[0].applicationId,
                resourceId,
                key,
                name,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ action: newAction[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create action");
    }
}
