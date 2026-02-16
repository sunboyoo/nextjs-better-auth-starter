import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { actions, resources, applications } from "@/db/schema";
import { eq, and, ilike, desc, sql, inArray } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";

// GET /api/admin/applications/[applicationId]/actions - List all actions for an application (across all resources)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const pagination = parsePagination(request);

    try {
        // Verify application exists
        const application = await db
            .select({ id: applications.id, name: applications.name })
            .from(applications)
            .where(eq(applications.id, applicationId))
            .limit(1);

        if (application.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        // Get all resource IDs for this application
        const applicationResources = await db
            .select({ id: resources.id })
            .from(resources)
            .where(eq(resources.applicationId, applicationId));

        const resourceIds = applicationResources.map(r => r.id);

        if (resourceIds.length === 0) {
            return NextResponse.json({
                application: application[0],
                actions: [],
                ...createPaginationMeta(0, pagination),
            });
        }

        const conditions = search
            ? and(inArray(actions.resourceId, resourceIds), ilike(actions.name, `%${search}%`))
            : inArray(actions.resourceId, resourceIds);

        // Fetch actions
        const actionsList = await db
            .select()
            .from(actions)
            .where(conditions)
            .orderBy(desc(actions.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        // Get resource info (name and key) for all unique resource IDs
        const actionResourceIds = [...new Set(actionsList.map(a => a.resourceId))];
        const resourceInfoList = actionResourceIds.length > 0
            ? await db
                .select({ id: resources.id, name: resources.name, key: resources.key })
                .from(resources)
                .where(inArray(resources.id, actionResourceIds))
            : [];

        // Create resource lookup map
        const resourceInfoMap = new Map(resourceInfoList.map(r => [r.id, { name: r.name, key: r.key }]));

        // Merge resource info into actions
        const actionsWithKeys = actionsList.map(action => {
            const resourceInfo = resourceInfoMap.get(action.resourceId);
            return {
                ...action,
                resourceName: resourceInfo?.name || null,
                resourceKey: resourceInfo?.key || null,
            };
        });

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(actions)
            .where(conditions);

        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            application: application[0],
            actions: actionsWithKeys,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch actions");
    }
}
