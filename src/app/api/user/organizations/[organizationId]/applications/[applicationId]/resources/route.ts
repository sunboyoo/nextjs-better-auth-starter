import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, resources, actions, member } from "@/db/schema";
import { eq, and, ilike, desc, count } from "drizzle-orm";
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
        .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
        .limit(1);
    return memberRecord[0] ?? null;
}

function isWriteRole(role: string): boolean {
    return role === "owner" || role === "admin";
}

// GET /api/user/organizations/[organizationId]/applications/[applicationId]/resources
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        // Verify application belongs to this organization
        const application = await db
            .select({ id: applications.id, name: applications.name })
            .from(applications)
            .where(and(eq(applications.id, applicationId), eq(applications.organizationId, organizationId)))
            .limit(1);

        if (application.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get("search") || "";

        const conditions = search
            ? and(eq(resources.applicationId, applicationId), ilike(resources.name, `%${search}%`))
            : eq(resources.applicationId, applicationId);

        const resourcesList = await db
            .select()
            .from(resources)
            .where(conditions)
            .orderBy(desc(resources.createdAt));

        // Get action counts per resource
        const actionCounts = await db
            .select({ resourceId: actions.resourceId, count: count() })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(eq(resources.applicationId, applicationId))
            .groupBy(actions.resourceId);

        const actionCountMap = new Map(actionCounts.map(a => [a.resourceId, Number(a.count)]));

        const resourcesWithCounts = resourcesList.map(resource => ({
            ...resource,
            actionCount: actionCountMap.get(resource.id) || 0,
        }));

        const countResult = await db
            .select({ count: count() })
            .from(resources)
            .where(conditions);
        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            application: application[0],
            resources: resourcesWithCounts,
            total,
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch resources");
    }
}

// POST /api/user/organizations/[organizationId]/applications/[applicationId]/resources
export async function POST(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can create resources" }, { status: 403 });
    }

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

        const keyRegex = /^[a-z0-9]+(_[a-z0-9]+)*$/;
        if (!keyRegex.test(key)) {
            return NextResponse.json(
                { error: "Key must be lowercase letters/numbers with underscores" },
                { status: 400 },
            );
        }

        // Verify application belongs to this organization
        const application = await db
            .select({ id: applications.id })
            .from(applications)
            .where(and(eq(applications.id, applicationId), eq(applications.organizationId, organizationId)))
            .limit(1);
        if (application.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        // Check if key already exists
        const existing = await db
            .select({ id: resources.id })
            .from(resources)
            .where(and(eq(resources.applicationId, applicationId), eq(resources.key, key)))
            .limit(1);
        if (existing.length > 0) {
            return NextResponse.json(
                { error: "Resource with this key already exists in this application" },
                { status: 400 },
            );
        }

        const newResource = await db
            .insert(resources)
            .values({ applicationId, key, name, description: description || null })
            .returning();

        return NextResponse.json({ resource: newResource[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create resource");
    }
}
