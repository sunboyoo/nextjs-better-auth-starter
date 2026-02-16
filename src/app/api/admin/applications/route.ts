import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, resources, actions } from "@/db/schema";
import { eq, ilike, desc, sql, count, and } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

// GET /api/admin/applications - List all applications with pagination and search
export async function GET(request: NextRequest) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const pagination = parsePagination(request);

    const isActiveParam = searchParams.get("isActive");

    try {
        const filters = [
            search ? ilike(applications.name, `%${search}%`) : undefined,
            isActiveParam !== null ? eq(applications.isActive, isActiveParam === "true") : undefined,
        ].filter(Boolean);

        const whereConditions = filters.length > 0
            ? filters.length === 1 ? filters[0] : sql`${filters[0]} AND ${filters[1]}` // Simple AND for two possible filters
            : undefined;

        // Note: For more complex filtering, properly combining with and() is better, but this suffices for now.
        // Actually, let's use drizzle's and() helper if possible, but for now array filter is fine.
        // Re-writing to be safer:
        // const whereConditions = and(...filters); // Requires importing and from drizzle-orm


        // Fetch applications
        const applicationsList = await db
            .select()
            .from(applications)
            .where(whereConditions)
            .orderBy(desc(applications.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        // Get resource counts grouped by application_id
        const resourceCounts = await db
            .select({
                applicationId: resources.applicationId,
                count: count(),
            })
            .from(resources)
            .groupBy(resources.applicationId);

        // Get action counts grouped by application_id
        const actionCounts = await db
            .select({
                applicationId: resources.applicationId,
                count: count(),
            })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .groupBy(resources.applicationId);

        // Create lookup maps
        const resourceCountMap = new Map(resourceCounts.map(r => [r.applicationId, Number(r.count)]));
        const actionCountMap = new Map(actionCounts.map(a => [a.applicationId, Number(a.count)]));

        // Merge counts into applications
        const applicationsWithCounts = applicationsList.map(application => ({
            ...application,
            resourceCount: resourceCountMap.get(application.id) || 0,
            actionCount: actionCountMap.get(application.id) || 0,
        }));

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(applications)
            .where(whereConditions);

        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            applications: applicationsWithCounts,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch applications");
    }
}

// POST /api/admin/applications - Create a new application
export async function POST(request: NextRequest) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    try {
        const body = await request.json();
        const schema = z.object({
            organizationId: z.string().trim().min(1),
            key: z.string().trim().min(1).max(50),
            name: z.string().trim().min(1).max(100),
            description: z.string().trim().max(1000).optional().nullable(),
            logo: z.string().trim().max(500).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { organizationId, key, name, description, logo } = result.data;

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

        // Check if key already exists within the same organization
        const existing = await db
            .select({ id: applications.id })
            .from(applications)
            .where(and(eq(applications.organizationId, organizationId), eq(applications.key, key)))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "Application with this key already exists in this organization" },
                { status: 400 }
            );
        }

        const newApplication = await db
            .insert(applications)
            .values({
                organizationId,
                key,
                name,
                description: description || null,
                logo: logo || null,
            })
            .returning();

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.applications.create",
            targetType: "application",
            targetId: newApplication[0]?.id ?? null,
            metadata: {
                key,
                name,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ application: newApplication[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create application");
    }
}
