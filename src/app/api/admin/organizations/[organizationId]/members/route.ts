import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member, user, organization } from "@/db/schema";
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

        const members = await db
            .select({
                id: member.id,
                role: member.role,
                createdAt: member.createdAt,
                userId: member.userId,
                userName: user.name,
                userEmail: user.email,
                userImage: user.image,
                userRole: user.role,
                userCreatedAt: user.createdAt,
            })
            .from(member)
            .leftJoin(user, eq(member.userId, user.id))
            .where(eq(member.organizationId, organizationId))
            .orderBy(desc(member.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset);

        const allMembers = await db
            .select({ id: member.id })
            .from(member)
            .where(eq(member.organizationId, organizationId));

        const total = allMembers.length;

        return NextResponse.json({
            organization: org[0],
            members,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch members");
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
            userId: z.string().trim().min(1).max(100),
            role: z.string().trim().min(1).max(100).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { userId, role: memberRole } = result.data;

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        if (existingUser.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if already a member of THIS organization
        const existingMember = await db
            .select({ id: member.id })
            .from(member)
            .where(and(
                eq(member.userId, userId),
                eq(member.organizationId, organizationId)
            ))
            .limit(1);

        if (existingMember.length > 0) {
            return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
        }

        // Add member
        const newMember = await db
            .insert(member)
            .values({
                id: nanoid(),
                organizationId: organizationId,
                userId,
                role: memberRole || "member",
                createdAt: new Date(),
            })
            .returning();

        return NextResponse.json({ member: newMember[0] }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "add member");
    }
}
