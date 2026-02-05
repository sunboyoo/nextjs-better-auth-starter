import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organization, member, organizationRole } from "@/db/schema";
import { eq, ilike, sql, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/api/auth-guard";
import { nanoid } from "nanoid";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

export async function GET(request: NextRequest) {
    // Verify admin access
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const pagination = parsePagination(request);

    try {
        // Build query conditions
        const whereConditions = search
            ? ilike(organization.name, `%${search}%`)
            : undefined;

        // Get organizations with member count
        const organizations = await db
            .select({
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                logo: organization.logo,
                createdAt: organization.createdAt,
                metadata: organization.metadata,
                memberCount: sql<number>`count(distinct ${member.id})`.as("member_count"),
                roleCount: sql<number>`count(distinct ${organizationRole.id}) + 3`.as("role_count"),
            })
            .from(organization)
            .leftJoin(member, eq(organization.id, member.organizationId))
            .leftJoin(organizationRole, eq(organization.id, organizationRole.organizationId))
            .where(whereConditions)
            .groupBy(organization.id)
            .orderBy(desc(organization.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        // Get total count
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(organization)
            .where(whereConditions);

        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            organizations,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch organizations");
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    try {
        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100),
            slug: z.string().trim().min(1).max(100).optional().nullable(),
            logo: z.string().trim().max(500).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { name, slug, logo } = result.data;

        // Generate slug if not provided
        const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        // Check if slug already exists
        const existing = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, orgSlug))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json({ error: "Organization with this slug already exists" }, { status: 400 });
        }

        // Create organization
        const newOrg = await db
            .insert(organization)
            .values({
                id: nanoid(),
                name,
                slug: orgSlug,
                logo,
                createdAt: new Date(),
            })
            .returning();

        return NextResponse.json({ organization: newOrg[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create organization");
    }
}
