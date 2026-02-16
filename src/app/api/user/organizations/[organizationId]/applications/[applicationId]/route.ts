import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, resources, actions, applicationRoles, member } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
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

// GET /api/user/organizations/[organizationId]/applications/[applicationId] - Get application details
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        // Fetch application
        const applicationResult = await db
            .select()
            .from(applications)
            .where(and(eq(applications.id, applicationId), eq(applications.organizationId, organizationId)))
            .limit(1);

        if (applicationResult.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const application = applicationResult[0];

        // Count resources
        const resourceCountResult = await db
            .select({ count: count() })
            .from(resources)
            .where(eq(resources.applicationId, applicationId));

        // Count actions (through resources)
        const actionCountResult = await db
            .select({ count: count() })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(eq(resources.applicationId, applicationId));

        // Count roles
        const roleCountResult = await db
            .select({ count: count() })
            .from(applicationRoles)
            .where(eq(applicationRoles.applicationId, applicationId));

        return NextResponse.json({
            application: {
                ...application,
                resourceCount: Number(resourceCountResult[0]?.count ?? 0),
                actionCount: Number(actionCountResult[0]?.count ?? 0),
                roleCount: Number(roleCountResult[0]?.count ?? 0),
            },
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch application details");
    }
}

// PUT /api/user/organizations/[organizationId]/applications/[applicationId] - Update application
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can update applications" }, { status: 403 });
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

        // Verify application belongs to this organization
        const existingApplication = await db
            .select({ id: applications.id })
            .from(applications)
            .where(and(eq(applications.id, applicationId), eq(applications.organizationId, organizationId)))
            .limit(1);

        if (existingApplication.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (result.data.name !== undefined) updateData.name = result.data.name;
        if (result.data.description !== undefined) updateData.description = result.data.description;
        if (result.data.logo !== undefined) updateData.logo = result.data.logo;
        if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;

        const updated = await db
            .update(applications)
            .set(updateData)
            .where(eq(applications.id, applicationId))
            .returning();

        return NextResponse.json({ application: updated[0] });
    } catch (error) {
        return handleApiError(error, "update application");
    }
}

// DELETE /api/user/organizations/[organizationId]/applications/[applicationId] - Delete application
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can delete applications" }, { status: 403 });
    }

    try {
        // Verify application belongs to this organization
        const existingApplication = await db
            .select({ id: applications.id })
            .from(applications)
            .where(and(eq(applications.id, applicationId), eq(applications.organizationId, organizationId)))
            .limit(1);

        if (existingApplication.length === 0) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        await db.delete(applications).where(eq(applications.id, applicationId));

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete application");
    }
}
