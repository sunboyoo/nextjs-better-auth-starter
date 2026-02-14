import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apps, resources, actions, appRoles, member } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; appId: string }>;
}

async function verifyOrgMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({ id: member.id, role: member.role })
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

// GET /api/user/organizations/[organizationId]/apps/[appId] - Get app details
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        const app = await db
            .select({
                id: apps.id,
                organizationId: apps.organizationId,
                key: apps.key,
                name: apps.name,
                description: apps.description,
                logo: apps.logo,
                isActive: apps.isActive,
                createdAt: apps.createdAt,
                updatedAt: apps.updatedAt,
                resourceCount: sql<number>`(SELECT COUNT(*) FROM ${resources} WHERE ${resources.appId} = ${apps.id})`,
                actionCount: sql<number>`(SELECT COUNT(*) FROM ${actions} INNER JOIN ${resources} ON ${actions.resourceId} = ${resources.id} WHERE ${resources.appId} = ${apps.id})`,
                roleCount: sql<number>`(SELECT COUNT(*) FROM ${appRoles} WHERE ${appRoles.appId} = ${apps.id})`,
            })
            .from(apps)
            .where(and(eq(apps.id, appId), eq(apps.organizationId, organizationId)))
            .limit(1);

        if (app.length === 0) {
            return NextResponse.json({ error: "App not found" }, { status: 404 });
        }

        return NextResponse.json({
            app: app[0],
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch app details");
    }
}

// PUT /api/user/organizations/[organizationId]/apps/[appId] - Update app
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can update apps" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100).optional(),
            description: z.string().trim().max(1000).optional().nullable(),
            logo: z.string().trim().max(500).optional().nullable(),
            isActive: z.boolean().optional(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        // Verify app belongs to this org
        const existingApp = await db
            .select({ id: apps.id })
            .from(apps)
            .where(and(eq(apps.id, appId), eq(apps.organizationId, organizationId)))
            .limit(1);

        if (existingApp.length === 0) {
            return NextResponse.json({ error: "App not found" }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (result.data.name !== undefined) updateData.name = result.data.name;
        if (result.data.description !== undefined) updateData.description = result.data.description;
        if (result.data.logo !== undefined) updateData.logo = result.data.logo;
        if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;

        const updated = await db
            .update(apps)
            .set(updateData)
            .where(eq(apps.id, appId))
            .returning();

        return NextResponse.json({ app: updated[0] });
    } catch (error) {
        return handleApiError(error, "update app");
    }
}

// DELETE /api/user/organizations/[organizationId]/apps/[appId] - Delete app
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, appId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can delete apps" }, { status: 403 });
    }

    try {
        // Verify app belongs to this org
        const existingApp = await db
            .select({ id: apps.id })
            .from(apps)
            .where(and(eq(apps.id, appId), eq(apps.organizationId, organizationId)))
            .limit(1);

        if (existingApp.length === 0) {
            return NextResponse.json({ error: "App not found" }, { status: 404 });
        }

        await db.delete(apps).where(eq(apps.id, appId));

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete app");
    }
}
