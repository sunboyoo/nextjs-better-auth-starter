import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applicationRoles, applications, member } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

interface RouteParams {
    params: Promise<{
        organizationId: string;
        applicationId: string;
        roleId: string;
    }>;
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

async function verifyApplicationOwnership(applicationId: string, organizationId: string) {
    const application = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
            and(
                eq(applications.id, applicationId),
                eq(applications.organizationId, organizationId),
            ),
        )
        .limit(1);

    return application.length > 0;
}

async function verifyRoleOwnership(roleId: string, applicationId: string) {
    const role = await db
        .select({ id: applicationRoles.id })
        .from(applicationRoles)
        .where(
            and(
                eq(applicationRoles.id, roleId),
                eq(applicationRoles.applicationId, applicationId),
            ),
        )
        .limit(1);

    return role.length > 0;
}

// GET /api/user/organizations/[organizationId]/applications/[applicationId]/roles/[roleId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, roleId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);

    if (!membership) {
        return NextResponse.json(
            { error: "Not a member of this organization" },
            { status: 403 },
        );
    }

    try {
        const isOwnedApplication = await verifyApplicationOwnership(applicationId, organizationId);
        if (!isOwnedApplication) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const role = await db
            .select()
            .from(applicationRoles)
            .where(
                and(
                    eq(applicationRoles.id, roleId),
                    eq(applicationRoles.applicationId, applicationId),
                ),
            )
            .limit(1);

        if (role.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        return NextResponse.json({
            role: role[0],
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch application role detail");
    }
}

// PUT /api/user/organizations/[organizationId]/applications/[applicationId]/roles/[roleId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, roleId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);

    if (!membership) {
        return NextResponse.json(
            { error: "Not a member of this organization" },
            { status: 403 },
        );
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json(
            { error: "Only owner or admin can manage application roles" },
            { status: 403 },
        );
    }

    try {
        const isOwnedApplication = await verifyApplicationOwnership(applicationId, organizationId);
        if (!isOwnedApplication) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const isOwnedRole = await verifyRoleOwnership(roleId, applicationId);
        if (!isOwnedRole) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100).optional(),
            description: z.string().trim().max(1000).optional().nullable(),
            isActive: z.boolean().optional(),
        });
        const result = schema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (result.data.name !== undefined) updateData.name = result.data.name;
        if (result.data.description !== undefined) updateData.description = result.data.description;
        if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const updatedRole = await db
            .update(applicationRoles)
            .set(updateData)
            .where(eq(applicationRoles.id, roleId))
            .returning();

        return NextResponse.json({ role: updatedRole[0] });
    } catch (error) {
        return handleApiError(error, "update application role");
    }
}

// DELETE /api/user/organizations/[organizationId]/applications/[applicationId]/roles/[roleId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId, roleId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);

    if (!membership) {
        return NextResponse.json(
            { error: "Not a member of this organization" },
            { status: 403 },
        );
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json(
            { error: "Only owner or admin can manage application roles" },
            { status: 403 },
        );
    }

    try {
        const isOwnedApplication = await verifyApplicationOwnership(applicationId, organizationId);
        if (!isOwnedApplication) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const isOwnedRole = await verifyRoleOwnership(roleId, applicationId);
        if (!isOwnedRole) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        await db
            .delete(applicationRoles)
            .where(eq(applicationRoles.id, roleId));

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete application role");
    }
}
