import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apps, resources, actions, member } from "@/db/schema";
import { eq, and, ilike, desc, sql, count } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string }>;
}

/**
 * Verify that the current user is a member of the given organization.
 * Returns the member record if found, or null.
 */
async function verifyOrgMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({
            id: member.id,
            role: member.role,
        })
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

// GET /api/user/organizations/[organizationId]/apps - List apps for this org
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const isActiveParam = searchParams.get("isActive");

    try {
        const conditions = [eq(apps.organizationId, organizationId)];
        if (search) conditions.push(ilike(apps.name, `%${search}%`));
        if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== "") {
            conditions.push(eq(apps.isActive, isActiveParam === "true"));
        }

        const whereConditions = and(...conditions);

        // Fetch apps
        const appsList = await db
            .select()
            .from(apps)
            .where(whereConditions)
            .orderBy(desc(apps.createdAt));

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
                appId: resources.appId,
                count: count(),
            })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .groupBy(resources.appId);

        // Create lookup maps
        const resourceCountMap = new Map(resourceCounts.map(r => [r.appId, Number(r.count)]));
        const actionCountMap = new Map(actionCounts.map(a => [a.appId, Number(a.count)]));

        // Merge counts into apps
        const appsWithCounts = appsList.map(app => ({
            ...app,
            resourceCount: resourceCountMap.get(app.id) || 0,
            actionCount: actionCountMap.get(app.id) || 0,
        }));

        return NextResponse.json({
            apps: appsWithCounts,
            total: appsList.length,
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch organization apps");
    }
}

// POST /api/user/organizations/[organizationId]/apps - Create a new app
export async function POST(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can create apps" }, { status: 403 });
    }

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

        // Validate key format
        const keyRegex = /^[a-z0-9]+(_[a-z0-9]+)*$/;
        if (!keyRegex.test(key)) {
            return NextResponse.json(
                { error: "Key must be lowercase letters/numbers with underscores (e.g., order_system)" },
                { status: 400 },
            );
        }

        // Check if key already exists within this org
        const existing = await db
            .select({ id: apps.id })
            .from(apps)
            .where(and(eq(apps.organizationId, organizationId), eq(apps.key, key)))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "App with this key already exists in this organization" },
                { status: 400 },
            );
        }

        const newApp = await db
            .insert(apps)
            .values({
                organizationId,
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
