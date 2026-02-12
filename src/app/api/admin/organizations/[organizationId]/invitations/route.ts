import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, organization, member } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type OrganizationInvitation = {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string | Date;
    createdAt: string | Date;
    inviterId: string;
};

const organizationInvitationApi = auth.api as unknown as {
    listInvitations: (input: {
        query: { organizationId: string };
        headers: Headers;
    }) => Promise<OrganizationInvitation[] | null | undefined>;
    createInvitation: (input: {
        body: {
            email: string;
            role: "member" | "owner" | "admin";
            organizationId: string;
            resend: boolean;
        };
        headers: Headers;
    }) => Promise<unknown>;
};

function toTimestamp(value: string | Date | undefined) {
    if (!value) return 0;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;
    const pagination = parsePagination(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const status = searchParams.get("status")?.trim() || "";

    try {
        // Verify organization exists
        const org = await db
            .select()
            .from(organization)
            .where(eq(organization.id, organizationId))
            .limit(1);

        if (org.length === 0) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Use Better Auth's official listInvitations API
        const allInvitations = await organizationInvitationApi.listInvitations({
            query: { organizationId },
            headers: await headers(),
        });

        // Apply search and status filters in application layer
        let filtered = allInvitations || [];

        if (search) {
            filtered = filtered.filter(inv =>
                inv.email.toLowerCase().includes(search)
            );
        }

        if (status && status !== "all") {
            filtered = filtered.filter(inv => inv.status === status);
        }

        // Sort by invitation creation time, newest first.
        filtered.sort((a, b) =>
            toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
        );

        // Calculate pagination
        const total = filtered.length;
        const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

        // Fetch inviter info for the paginated results
        const inviterIds = [...new Set(paginated.map(inv => inv.inviterId).filter(Boolean))];
        const inviters = inviterIds.length > 0
            ? await db
                .select({ id: user.id, name: user.name, email: user.email, image: user.image })
                .from(user)
                .where(sql`${user.id} IN ${inviterIds}`)
            : [];

        const inviterMap = new Map(inviters.map(u => [u.id, u]));

        // Transform to match frontend expected format
        const invitations = paginated.map(inv => {
            const inviter = inviterMap.get(inv.inviterId);
            return {
                id: inv.id,
                email: inv.email,
                role: inv.role,
                status: inv.status,
                expiresAt: inv.expiresAt,
                createdAt: inv.createdAt,
                inviterId: inv.inviterId,
                inviterName: inviter?.name || null,
                inviterEmail: inviter?.email || null,
                inviterImage: inviter?.image || null,
            };
        });

        return NextResponse.json({
            organization: org[0],
            invitations,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch invitations");
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
        const bodySchema = z.object({
            email: z.string().email().trim(),
            role: z.string().trim().min(1).max(100).optional().default("member"),
            resend: z.boolean().optional().default(false),
        });

        const result = bodySchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const { email, role, resend } = result.data;

        // Verify organization exists
        const org = await db
            .select()
            .from(organization)
            .where(eq(organization.id, organizationId))
            .limit(1);

        if (org.length === 0) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Check if admin is a member of this organization (REQUIRED for Better Auth compliance)
        const adminMembership = await db
            .select()
            .from(member)
            .where(and(
                eq(member.organizationId, organizationId),
                eq(member.userId, authResult.user.id)
            ))
            .limit(1);

        if (adminMembership.length === 0) {
            return NextResponse.json({
                error: "You must be a member of this organization to send invitations. Please add yourself as a member first using the 'Add Member' feature.",
                code: "NOT_ORG_MEMBER"
            }, { status: 403 });
        }

        // Use Better Auth's standard createInvitation API
        const invitationResult = await organizationInvitationApi.createInvitation({
            body: {
                email,
                role: role as "member" | "owner" | "admin",
                organizationId,
                resend,
            },
            headers: await headers(),
        });

        return NextResponse.json({ invitation: invitationResult }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create invitation");
    }
}
