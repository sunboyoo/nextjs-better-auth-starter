import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, resources, actions, member } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; applicationId: string; resourceId: string }>;
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

async function verifyResourceOwnership(applicationId: string, resourceId: string, organizationId: string) {
    const result = await db
        .select({ id: resources.id })
        .from(resources)
        .innerJoin(applications, eq(resources.applicationId, applications.id))
        .where(
            and(
                eq(resources.id, resourceId),
                eq(resources.applicationId, applicationId),
                eq(applications.organizationId, organizationId),
            ),
        )
        .limit(1);
    return result.length > 0;
}

// GET /api/user/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, resourceId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        // Fetch resource
        const resource = await db
            .select({
                id: resources.id,
                applicationId: resources.applicationId,
                key: resources.key,
                name: resources.name,
                description: resources.description,
                createdAt: resources.createdAt,
                updatedAt: resources.updatedAt,
            })
            .from(resources)
            .innerJoin(applications, eq(resources.applicationId, applications.id))
            .where(
                and(
                    eq(resources.id, resourceId),
                    eq(resources.applicationId, applicationId),
                    eq(applications.organizationId, organizationId),
                ),
            )
            .limit(1);

        if (resource.length === 0) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        // Count actions for this resource
        const actionCountResult = await db
            .select({ count: count() })
            .from(actions)
            .where(eq(actions.resourceId, resourceId));

        // Get application name for breadcrumb
        const application = await db
            .select({ name: applications.name })
            .from(applications)
            .where(eq(applications.id, applicationId))
            .limit(1);

        return NextResponse.json({
            resource: {
                ...resource[0],
                actionCount: Number(actionCountResult[0]?.count ?? 0),
            },
            applicationName: application[0]?.name ?? "",
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch resource details");
    }
}

// PUT /api/user/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, resourceId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can update resources" }, { status: 403 });
    }

    try {
        if (!(await verifyResourceOwnership(applicationId, resourceId, organizationId))) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100).optional(),
            description: z.string().trim().max(1000).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (result.data.name !== undefined) updateData.name = result.data.name;
        if (result.data.description !== undefined) updateData.description = result.data.description;

        const updated = await db
            .update(resources)
            .set(updateData)
            .where(eq(resources.id, resourceId))
            .returning();

        return NextResponse.json({ resource: updated[0] });
    } catch (error) {
        return handleApiError(error, "update resource");
    }
}

// DELETE /api/user/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, resourceId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can delete resources" }, { status: 403 });
    }

    try {
        if (!(await verifyResourceOwnership(applicationId, resourceId, organizationId))) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        await db.delete(resources).where(eq(resources.id, resourceId));
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete resource");
    }
}
