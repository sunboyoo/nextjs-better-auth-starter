import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { resources, apps, actions } from "@/db/schema";
import { eq, and, ilike, desc, sql, count } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

// GET /api/admin/apps/[appId]/resources - List resources by appId
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ appId: string }> }
) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { appId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const pagination = parsePagination(request);

    try {
        // Verify app exists
        const app = await db
            .select({ id: apps.id, name: apps.name })
            .from(apps)
            .where(eq(apps.id, appId))
            .limit(1);

        if (app.length === 0) {
            return NextResponse.json({ error: "App not found" }, { status: 404 });
        }

        const conditions = search
            ? and(eq(resources.appId, appId), ilike(resources.name, `%${search}%`))
            : eq(resources.appId, appId);

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
            .where(eq(resources.appId, appId))
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
            app: app[0],
            resources: resourcesWithCounts,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch resources");
    }
}

// POST /api/admin/apps/[appId]/resources - Create a new resource
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ appId: string }> }
) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { appId } = await params;

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

        // Verify app exists
        const app = await db
            .select({ id: apps.id })
            .from(apps)
            .where(eq(apps.id, appId))
            .limit(1);

        if (app.length === 0) {
            return NextResponse.json({ error: "App not found" }, { status: 404 });
        }

        // Check if resource key already exists for this app
        const existing = await db
            .select({ id: resources.id })
            .from(resources)
            .where(and(eq(resources.appId, appId), eq(resources.key, key)))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "Resource with this key already exists in this app" },
                { status: 400 }
            );
        }

        const newResource = await db
            .insert(resources)
            .values({
                appId,
                key,
                name,
                description: description || null,
            })
            .returning();

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.apps.resources.create",
            targetType: "resource",
            targetId: newResource[0]?.id ?? null,
            metadata: {
                appId,
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
