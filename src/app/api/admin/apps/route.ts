import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apps, resources, actions } from "@/db/schema";
import { eq, ilike, desc, sql, count } from "drizzle-orm";
import { requireAdmin } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

// GET /api/admin/apps - List all apps with pagination and search
export async function GET(request: NextRequest) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const pagination = parsePagination(request);

    const isActiveParam = searchParams.get("isActive");

    try {
        const filters = [
            search ? ilike(apps.name, `%${search}%`) : undefined,
            isActiveParam !== null ? eq(apps.isActive, isActiveParam === "true") : undefined,
        ].filter(Boolean);

        const whereConditions = filters.length > 0
            ? filters.length === 1 ? filters[0] : sql`${filters[0]} AND ${filters[1]}` // Simple AND for two possible filters
            : undefined;

        // Note: For more complex filtering, properly combining with and() is better, but this suffices for now.
        // Actually, let's use drizzle's and() helper if possible, but for now array filter is fine.
        // Re-writing to be safer:
        // const whereConditions = and(...filters); // Requires importing and from drizzle-orm


        // Fetch apps
        const appsList = await db
            .select()
            .from(apps)
            .where(whereConditions)
            .orderBy(desc(apps.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        // Get resource counts grouped by app_id
        const resourceCounts = await db
            .select({
                appId: resources.appId,
                count: count(),
            })
            .from(resources)
            .groupBy(resources.appId);

        // Get action counts grouped by app_id
        const actionCounts = await db
            .select({
                appId: actions.appId,
                count: count(),
            })
            .from(actions)
            .groupBy(actions.appId);

        // Create lookup maps
        const resourceCountMap = new Map(resourceCounts.map(r => [r.appId, Number(r.count)]));
        const actionCountMap = new Map(actionCounts.map(a => [a.appId, Number(a.count)]));

        // Merge counts into apps
        const appsWithCounts = appsList.map(app => ({
            ...app,
            resourceCount: resourceCountMap.get(app.id) || 0,
            actionCount: actionCountMap.get(app.id) || 0,
        }));

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(apps)
            .where(whereConditions);

        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            apps: appsWithCounts,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch apps");
    }
}

// POST /api/admin/apps - Create a new app
export async function POST(request: NextRequest) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    try {
        const body = await request.json();
        const schema = z.object({
            key: z.string().trim().min(1).max(50),
            name: z.string().trim().min(1).max(100),
            description: z.string().trim().max(1000).optional().nullable(),
            logo: z.string().trim().max(500).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { key, name, description, logo } = result.data;

        if (!key || !name) {
            return NextResponse.json(
                { error: "Key and name are required" },
                { status: 400 }
            );
        }

        // Validate key format
        const keyRegex = /^[a-z0-9]+(_[a-z0-9]+)*$/;
        if (!keyRegex.test(key)) {
            return NextResponse.json(
                { error: "Key must be lowercase letters/numbers with underscores (e.g., order_system)" },
                { status: 400 }
            );
        }

        // Check if key already exists
        const existing = await db
            .select({ id: apps.id })
            .from(apps)
            .where(eq(apps.key, key))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "App with this key already exists" },
                { status: 400 }
            );
        }

        const newApp = await db
            .insert(apps)
            .values({
                key,
                name,
                description: description || null,
                logo: logo || null,
            })
            .returning();

        return NextResponse.json({ app: newApp[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create app");
    }
}
