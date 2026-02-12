import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

type OrganizationMemberApi = {
    id?: string;
    role?: string;
    createdAt?: string | Date;
    userId?: string;
    user?: {
        id?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string | null;
        createdAt?: string | Date;
    };
};

function toTimestamp(value: string | Date | undefined): number {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdminAction("organization.members.list");
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;
    const pagination = parsePagination(request);

    try {
        const orgRaw = (await extendedAuthApi.getFullOrganization({
            query: { organizationId },
            headers: authResult.headers,
        })) as { id?: string; name?: string; slug?: string; logo?: string | null } | null;

        if (!orgRaw?.id) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        const membersRaw = (await extendedAuthApi.listMembers({
            query: { organizationId },
            headers: authResult.headers,
        })) as unknown;
        const membersList = (Array.isArray(membersRaw)
            ? membersRaw
            : []) as OrganizationMemberApi[];
        const userIds = Array.from(
            new Set(
                membersList
                    .map((memberEntry) => memberEntry.user?.id || memberEntry.userId)
                    .filter((id): id is string => typeof id === "string" && id.length > 0),
            ),
        );
        const userRecords =
            userIds.length > 0
                ? await db
                      .select({
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          image: user.image,
                          role: user.role,
                          createdAt: user.createdAt,
                      })
                      .from(user)
                      .where(inArray(user.id, userIds))
                : [];
        const userMap = new Map(userRecords.map((entry) => [entry.id, entry]));

        const normalizedMembers = membersList
            .map((memberEntry) => {
                const resolvedUserId = memberEntry.user?.id || memberEntry.userId;
                if (!resolvedUserId || !memberEntry.id) return null;
                const fallbackUser = userMap.get(resolvedUserId);

                return {
                    id: memberEntry.id,
                    role: memberEntry.role ?? "member",
                    createdAt: memberEntry.createdAt ?? new Date(0).toISOString(),
                    userId: resolvedUserId,
                    userName: memberEntry.user?.name ?? fallbackUser?.name ?? null,
                    userEmail: memberEntry.user?.email ?? fallbackUser?.email ?? null,
                    userImage: memberEntry.user?.image ?? fallbackUser?.image ?? null,
                    userRole: memberEntry.user?.role ?? fallbackUser?.role ?? null,
                    userCreatedAt:
                        memberEntry.user?.createdAt ?? fallbackUser?.createdAt ?? null,
                };
            })
            .filter(
                (
                    entry,
                ): entry is {
                    id: string;
                    role: string;
                    createdAt: string | Date;
                    userId: string;
                    userName: string | null;
                    userEmail: string | null;
                    userImage: string | null;
                    userRole: string | null;
                    userCreatedAt: string | Date | null;
                } => entry !== null,
            )
            .sort(
                (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt),
            );

        const total = normalizedMembers.length;
        const members = normalizedMembers.slice(
            pagination.offset,
            pagination.offset + pagination.limit,
        );

        return NextResponse.json({
            organization: {
                id: orgRaw.id,
                name: orgRaw.name ?? "",
                slug: orgRaw.slug ?? "",
                logo: orgRaw.logo ?? null,
            },
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
    const authResult = await requireAdminAction("organization.members.manage");
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

        const newMember = await extendedAuthApi.addMember({
            body: {
                organizationId,
                userId,
                role: memberRole || "member",
            },
            headers: authResult.headers,
        });
        const memberPayload =
            (newMember as { member?: unknown } | null)?.member ?? newMember;
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.members.add",
            targetType: "organization-member",
            targetId:
                (memberPayload as { id?: string } | null)?.id ?? null,
            metadata: {
                organizationId,
                userId,
                role: memberRole || "member",
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ member: memberPayload }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "add member");
    }
}
