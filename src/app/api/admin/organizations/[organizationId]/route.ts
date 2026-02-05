import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organization, member, organizationRole } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    // Verify admin access
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;

    try {
        // Get organization
        const [org] = await db
            .select({
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                logo: organization.logo,
                createdAt: organization.createdAt,
                metadata: organization.metadata,
            })
            .from(organization)
            .where(eq(organization.id, organizationId))
            .limit(1);

        if (!org) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            );
        }

        // Get member count separately
        const memberCountResult = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(member)
            .where(eq(member.organizationId, organizationId));
        const memberCount = Number(memberCountResult[0]?.count ?? 0);

        // Get custom role count separately (built-in roles: owner, admin, member = 3)
        const BUILT_IN_ROLES_COUNT = 3;
        const roleCountResult = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(organizationRole)
            .where(eq(organizationRole.organizationId, organizationId));
        const customRoleCount = Number(roleCountResult[0]?.count ?? 0);
        const roleCount = BUILT_IN_ROLES_COUNT + customRoleCount;

        return NextResponse.json({
            organization: {
                ...org,
                memberCount,
                roleCount,
            },
        });
    } catch (error) {
        return handleApiError(error, "fetch organization");
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    // Verify admin access
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            name: z.string().min(1).optional(),
            slug: z.string().min(1).optional(),
            logo: z.string().url().optional().nullable(),
            metadata: z.preprocess(
                (value) => {
                    if (value === undefined || value === null) return value;
                    if (typeof value === "string") return value;
                    try {
                        return JSON.stringify(value);
                    } catch {
                        return value;
                    }
                },
                z.string().optional().nullable()
            ),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const { name, slug, logo, metadata } = result.data;

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (slug !== undefined) updateData.slug = slug;
        if (logo !== undefined) updateData.logo = logo;
        if (metadata !== undefined) updateData.metadata = metadata;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            );
        }

        // Update organization
        const [updatedOrg] = await db
            .update(organization)
            .set(updateData)
            .where(eq(organization.id, organizationId))
            .returning();

        if (!updatedOrg) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ organization: updatedOrg });
    } catch (error) {
        return handleApiError(error, "update organization");
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;

    try {
        // Delete organization (members and roles will be cascade deleted due to FK constraints)
        await db.delete(organization).where(eq(organization.id, organizationId));

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete organization");
    }
}
