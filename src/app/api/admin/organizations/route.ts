import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organization, member, organizationRole } from "@/db/schema";
import { eq, ilike, sql, inArray } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

type OrganizationSummary = {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date | string;
    metadata?: string | null;
};

function toSafeSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
    const authResult = await requireAdminAction("organizations.list");
    if (!authResult.success) return authResult.response;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const pagination = parsePagination(request);

    try {
        const organizationsRaw = await extendedAuthApi.listOrganizations({
            headers: authResult.headers,
        });
        const normalizedOrganizations = (Array.isArray(organizationsRaw)
            ? organizationsRaw
            : []
        ) as OrganizationSummary[];
        const lowerSearch = search.trim().toLowerCase();
        const filteredOrganizations = lowerSearch
            ? normalizedOrganizations.filter((organization) => {
                  const name = (organization.name ?? "").toLowerCase();
                  const slug = (organization.slug ?? "").toLowerCase();
                  return name.includes(lowerSearch) || slug.includes(lowerSearch);
              })
            : normalizedOrganizations;

        filteredOrganizations.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        const total = filteredOrganizations.length;
        const paginatedOrganizations = filteredOrganizations.slice(
            pagination.offset,
            pagination.offset + pagination.limit,
        );
        const organizationIds = paginatedOrganizations.map((organization) => organization.id);
        let memberCountMap = new Map<string, number>();
        let customRoleCountMap = new Map<string, number>();

        if (organizationIds.length > 0) {
            const memberCounts = await db
                .select({
                    organizationId: member.organizationId,
                    count: sql<number>`count(*)`,
                })
                .from(member)
                .where(inArray(member.organizationId, organizationIds))
                .groupBy(member.organizationId);
            memberCountMap = new Map(
                memberCounts.map((row) => [row.organizationId, Number(row.count)]),
            );

            const roleCounts = await db
                .select({
                    organizationId: organizationRole.organizationId,
                    count: sql<number>`count(*)`,
                })
                .from(organizationRole)
                .where(inArray(organizationRole.organizationId, organizationIds))
                .groupBy(organizationRole.organizationId);
            customRoleCountMap = new Map(
                roleCounts.map((row) => [row.organizationId, Number(row.count)]),
            );
        }

        const organizations = paginatedOrganizations.map((organization) => ({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            logo: organization.logo ?? null,
            createdAt: organization.createdAt,
            metadata: organization.metadata ?? null,
            memberCount: memberCountMap.get(organization.id) ?? 0,
            roleCount: (customRoleCountMap.get(organization.id) ?? 0) + 3,
        }));

        return NextResponse.json({
            organizations,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch organizations");
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireAdminAction("organizations.create");
    if (!authResult.success) return authResult.response;

    try {
        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100),
            slug: z.string().trim().min(1).max(100).optional().nullable(),
            logo: z.string().trim().max(500).optional().nullable(),
            metadata: z.string().trim().max(5000).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { name, slug, logo } = result.data;

        // Generate slug if not provided
        const organizationSlug = toSafeSlug(slug || name);

        // Check if slug already exists
        const existing = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, organizationSlug))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json({ error: "Organization with this slug already exists" }, { status: 400 });
        }

        const createBody: {
            name: string;
            slug: string;
            logo?: string;
        } = {
            name,
            slug: organizationSlug,
        };
        if (typeof logo === "string" && logo.trim().length > 0) {
            createBody.logo = logo;
        }

        const createdOrganization = await extendedAuthApi.createOrganization({
            body: createBody,
            headers: authResult.headers,
        });
        const organizationPayload =
            (createdOrganization as { organization?: unknown } | null)
                ?.organization ?? createdOrganization;
        const createdOrganizationId =
            (organizationPayload as { id?: string } | null)?.id ?? null;
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organizations.create",
            targetType: "organization",
            targetId: createdOrganizationId,
            metadata: {
                name,
                slug: organizationSlug,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ organization: organizationPayload }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create organization");
    }
}
