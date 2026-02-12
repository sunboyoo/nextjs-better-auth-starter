import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organization, member, organizationRole } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

type FullOrganizationResponse = {
    id?: string;
    name?: string;
    slug?: string;
    logo?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    metadata?: string | null;
    members?: unknown[];
};

function toSafeSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdminAction("organizations.read");
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;

    try {
        const organizationRaw = (await extendedAuthApi.getFullOrganization({
            query: { organizationId },
            headers: authResult.headers,
        })) as FullOrganizationResponse | null;

        if (!organizationRaw?.id) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            );
        }

        const memberCount = Array.isArray(organizationRaw.members)
            ? organizationRaw.members.length
            : 0;
        const customRoleCountResult = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(organizationRole)
            .where(eq(organizationRole.organizationId, organizationId));
        const roleCount = Number(customRoleCountResult[0]?.count ?? 0) + 3;

        return NextResponse.json({
            organization: {
                id: organizationRaw.id,
                name: organizationRaw.name ?? "",
                slug: organizationRaw.slug ?? "",
                logo: organizationRaw.logo ?? null,
                createdAt: organizationRaw.createdAt ?? null,
                updatedAt: organizationRaw.updatedAt ?? null,
                metadata: organizationRaw.metadata ?? null,
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
    const authResult = await requireAdminAction("organizations.update");
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
        const updateData: {
            name?: string;
            slug?: string;
            logo?: string | null;
            metadata?: string | null;
        } = {};
        if (name !== undefined) updateData.name = name;
        if (slug !== undefined) updateData.slug = toSafeSlug(slug);
        if (logo !== undefined) updateData.logo = logo;
        if (metadata !== undefined) updateData.metadata = metadata ?? null;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            );
        }

        if (updateData.slug) {
            const existing = await db
                .select({ id: organization.id })
                .from(organization)
                .where(eq(organization.slug, updateData.slug))
                .limit(1);
            if (existing.length > 0 && existing[0].id !== organizationId) {
                return NextResponse.json(
                    { error: "Organization with this slug already exists" },
                    { status: 400 },
                );
            }
        }

        const updatedOrg = await extendedAuthApi.updateOrganization({
            body: {
                organizationId,
                data: updateData,
            },
            headers: authResult.headers,
        });
        const organizationPayload =
            (updatedOrg as { organization?: unknown } | null)?.organization ??
            updatedOrg;
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organizations.update",
            targetType: "organization",
            targetId: organizationId,
            metadata: {
                fields: Object.keys(updateData),
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ organization: organizationPayload });
    } catch (error) {
        return handleApiError(error, "update organization");
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdminAction("organizations.delete");
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;

    try {
        await extendedAuthApi.deleteOrganization({
            body: { organizationId },
            headers: authResult.headers,
        });
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organizations.delete",
            targetType: "organization",
            targetId: organizationId,
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete organization");
    }
}
