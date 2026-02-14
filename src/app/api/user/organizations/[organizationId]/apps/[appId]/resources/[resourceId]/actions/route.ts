import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apps, resources, actions, member } from "@/db/schema";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; appId: string; resourceId: string }>;
}

async function verifyOrgMembership(userId: string, organizationId: string) {
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

async function verifyResourceOwnership(appId: string, resourceId: string, organizationId: string) {
    const result = await db
        .select({ id: resources.id, name: resources.name })
        .from(resources)
        .innerJoin(apps, eq(resources.appId, apps.id))
        .where(
            and(
                eq(resources.id, resourceId),
                eq(resources.appId, appId),
                eq(apps.organizationId, organizationId),
            ),
        )
        .limit(1);
    return result[0] ?? null;
}

// GET /api/user/organizations/[organizationId]/apps/[appId]/resources/[resourceId]/actions
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, resourceId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        const resource = await verifyResourceOwnership(appId, resourceId, organizationId);
        if (!resource) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get("search") || "";

        const conditions = search
            ? and(eq(actions.resourceId, resourceId), ilike(actions.name, `%${search}%`))
            : eq(actions.resourceId, resourceId);

        const actionsList = await db
            .select()
            .from(actions)
            .where(conditions)
            .orderBy(desc(actions.createdAt));

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(actions)
            .where(conditions);
        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            resource: { id: resource.id, name: resource.name },
            actions: actionsList,
            total,
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch actions");
    }
}

// POST /api/user/organizations/[organizationId]/apps/[appId]/resources/[resourceId]/actions
export async function POST(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, resourceId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can create actions" }, { status: 403 });
    }

    try {
        const resource = await verifyResourceOwnership(appId, resourceId, organizationId);
        if (!resource) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

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

        // Check if key already exists
        const existing = await db
            .select({ id: actions.id })
            .from(actions)
            .where(and(eq(actions.resourceId, resourceId), eq(actions.key, key)))
            .limit(1);
        if (existing.length > 0) {
            return NextResponse.json(
                { error: "Action with this key already exists for this resource" },
                { status: 400 },
            );
        }

        const newAction = await db
            .insert(actions)
            .values({ resourceId, key, name, description: description || null })
            .returning();

        return NextResponse.json({ action: newAction[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create action");
    }
}
