import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { resources, applications, actions } from "@/db/schema";
import { eq, and, ilike, desc, sql, count } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

// GET /api/admin/applications/[applicationId]/resources - List resources by applicationId
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

        const conditions = search
            ? and(eq(resources.applicationId, applicationId), ilike(resources.name, `%${search}%`))
            : eq(resources.applicationId, applicationId);

        // Fetch resources
        const resourcesList = await db
            .select()
            .from(resources)
            .where(conditions)
            .orderBy(desc(resources.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        // Get action counts grouped by resource_id
        const actionCounts = await db
            .select({
                resourceId: actions.resourceId,
                count: count(),
            })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(eq(resources.applicationId, applicationId))
            .groupBy(actions.resourceId);

        // Create lookup map
        const actionCountMap = new Map(actionCounts.map(a => [a.resourceId, Number(a.count)]));

        // Merge counts into resources
        const resourcesWithCounts = resourcesList.map(resource => ({
            ...resource,
            actionCount: actionCountMap.get(resource.id) || 0,
        }));

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(resources)
            .where(conditions);

        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            application: application[0],
            resources: resourcesWithCounts,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch resources");
    }
}

// POST /api/admin/applications/[applicationId]/resources - Create a new resource
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { applicationId } = await params;

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

        // Verify application exists
        const application = await db
            .select({ id: applications.id })
            .from(applications)
            .where(eq(applications.id, applicationId))
            .limit(1);

        if (application.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        // Check if resource key already exists for this application
        const existing = await db
            .select({ id: resources.id })
            .from(resources)
            .where(and(eq(resources.applicationId, applicationId), eq(resources.key, key)))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "Resource with this key already exists in this application" },
                { status: 400 }
            );
        }

        const newResource = await db
            .insert(resources)
            .values({
                applicationId,
                key,
                name,
                description: description || null,
            })
            .returning();

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.applications.resources.create",
            targetType: "resource",
            targetId: newResource[0]?.id ?? null,
            metadata: {
                applicationId,
                key,
                name,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ resource: newResource[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create resource");
    }
}
