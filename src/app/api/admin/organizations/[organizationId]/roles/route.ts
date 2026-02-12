import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationRole, organization, member, user } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/api/auth-guard";
import { nanoid } from "nanoid";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;
    const pagination = parsePagination(request);

    try {
        const org = await db
            .select()
            .from(organization)
            .where(eq(organization.id, organizationId))
            .limit(1);

        if (org.length === 0) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Get active members with user details by role
        const activeMembers = await db
            .select({
                role: member.role,
                memberId: member.id,
                user: {
                    name: user.name,
                    image: user.image,
                    email: user.email,
                },
            })
            .from(member)
            .innerJoin(user, eq(member.userId, user.id))
            .where(eq(member.organizationId, organizationId));

        const activeRoleMembers = activeMembers.reduce((acc, curr) => {
            if (!acc[curr.role]) {
                acc[curr.role] = [];
            }
            acc[curr.role].push({
                memberId: curr.memberId,
                user: curr.user,
            });
            return acc;
        }, {} as Record<string, { memberId: string; user: { name: string; image: string | null; email: string } }[]>);

        const roles = await db
            .select()
            .from(organizationRole)
            .where(eq(organizationRole.organizationId, organizationId))
            .orderBy(desc(organizationRole.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        const allRoles = await db
            .select({ id: organizationRole.id })
            .from(organizationRole)
            .where(eq(organizationRole.organizationId, organizationId));

        const total = allRoles.length;

        return NextResponse.json({
            organization: org[0],
            roles,
            activeRoleMembers,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch roles");
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            role: z.string().trim().min(1).max(100),
            permission: z.string().trim().max(10000).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { role, permission } = result.data;

        if (!role) {
            return NextResponse.json({ error: "Role name is required" }, { status: 400 });
        }

        // Check if role already exists
        const existing = await db
            .select({ id: organizationRole.id })
            .from(organizationRole)
            .where(
                and(
                    eq(organizationRole.organizationId, organizationId),
                    eq(organizationRole.role, role)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json({ error: "Role already exists" }, { status: 400 });
        }

        const newRole = await db
            .insert(organizationRole)
            .values({
                id: nanoid(),
                organizationId: organizationId,
                role,
                permission: permission || "{}",
                createdAt: new Date(),
            })
            .returning();

        return NextResponse.json({ role: newRole[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create role");
    }
}
