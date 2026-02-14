import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, team, teamMember } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

type TeamMemberApi = {
    id?: string;
    teamId?: string;
    userId?: string;
    createdAt?: string | Date;
};

function toTimestamp(value: string | Date | null | undefined): number {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

// GET /api/admin/organizations/[organizationId]/teams/[teamId]/members - List team members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; teamId: string }> }
) {
    const authResult = await requireAdminAction("organization.teams.members.list");
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId } = await params;
    const pagination = parsePagination(request);

    try {
        // Verify team exists and belongs to the organization
        const teamResult = await db
            .select()
            .from(team)
            .where(eq(team.id, teamId))
            .limit(1);

        if (teamResult.length === 0 || teamResult[0].organizationId !== organizationId) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // List team members via better-auth API
        const membersRaw = await extendedAuthApi.listTeamMembers({
            query: { teamId },
            headers: authResult.headers,
        });

        const membersList = (Array.isArray(membersRaw) ? membersRaw : []) as TeamMemberApi[];

        // Get user info for each member
        const userIds = Array.from(
            new Set(
                membersList
                    .map((m) => m.userId)
                    .filter((id): id is string => typeof id === "string" && id.length > 0)
            )
        );

        const userRecords =
            userIds.length > 0
                ? await db
                    .select({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        image: user.image,
                    })
                    .from(user)
                    .where(inArray(user.id, userIds))
                : [];

        const userMap = new Map(userRecords.map((u) => [u.id, u]));

        const normalizedMembers = membersList
            .filter((m): m is Required<Pick<TeamMemberApi, "userId">> & TeamMemberApi => !!m.userId)
            .map((m) => {
                const userData = userMap.get(m.userId);
                return {
                    id: m.id ?? m.userId,
                    teamId: m.teamId ?? teamId,
                    userId: m.userId,
                    createdAt: m.createdAt ?? null,
                    userName: userData?.name ?? null,
                    userEmail: userData?.email ?? null,
                    userImage: userData?.image ?? null,
                };
            })
            .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));

        const total = normalizedMembers.length;
        const members = normalizedMembers.slice(
            pagination.offset,
            pagination.offset + pagination.limit
        );

        return NextResponse.json({
            team: {
                id: teamResult[0].id,
                name: teamResult[0].name,
            },
            members,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch team members");
    }
}

// POST /api/admin/organizations/[organizationId]/teams/[teamId]/members - Add team member
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; teamId: string }> }
) {
    const authResult = await requireAdminAction("organization.teams.members.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            userId: z.string().trim().min(1),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { userId } = result.data;

        const newMember = await extendedAuthApi.addTeamMember({
            body: { teamId, userId },
            headers: authResult.headers,
        });

        const memberPayload =
            (newMember as { member?: unknown } | null)?.member ?? newMember;

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.teams.members.add",
            targetType: "team-member",
            targetId: (memberPayload as { id?: string } | null)?.id ?? null,
            metadata: { organizationId, teamId, userId },
            headers: authResult.headers,
        });

        return NextResponse.json({ member: memberPayload }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "add team member");
    }
}
