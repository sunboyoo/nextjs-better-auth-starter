import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, team, teamMember, member } from "@/db/schema";
import { eq, and, inArray, notInArray } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { extendedAuthApi } from "@/lib/auth-api";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; teamId: string }>;
}

async function verifyOrganizationMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
        .limit(1);
    return memberRecord[0] ?? null;
}

function isWriteRole(role: string): boolean {
    return role === "owner" || role === "admin";
}

// GET /api/user/organizations/[organizationId]/teams/[teamId]/members
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        // Verify team belongs to organization
        const teamResult = await db
            .select()
            .from(team)
            .where(eq(team.id, teamId))
            .limit(1);

        if (teamResult.length === 0 || teamResult[0].organizationId !== organizationId) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Fetch team members
        const members = await db
            .select()
            .from(teamMember)
            .where(eq(teamMember.teamId, teamId));

        // Get user info
        const userIds = members.map((m) => m.userId).filter(Boolean);
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

        const enrichedMembers = members
            .map((m) => {
                const userData = userMap.get(m.userId);
                return {
                    id: m.id,
                    teamId: m.teamId,
                    userId: m.userId,
                    createdAt: m.createdAt,
                    userName: userData?.name ?? null,
                    userEmail: userData?.email ?? null,
                    userImage: userData?.image ?? null,
                };
            })
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );

        return NextResponse.json({
            team: { id: teamResult[0].id, name: teamResult[0].name },
            members: enrichedMembers,
            total: enrichedMembers.length,
            canWrite: isWriteRole(membership.role),
        });
    } catch (error) {
        return handleApiError(error, "fetch team members");
    }
}

// POST /api/user/organizations/[organizationId]/teams/[teamId]/members - Add member
export async function POST(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (!isWriteRole(membership.role)) {
        return NextResponse.json({ error: "Only owner or admin can add team members" }, { status: 403 });
    }

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

        // Verify team belongs to organization
        const teamResult = await db
            .select()
            .from(team)
            .where(eq(team.id, teamId))
            .limit(1);

        if (teamResult.length === 0 || teamResult[0].organizationId !== organizationId) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Verify user is a member of the organization
        const organizationMembership = await db
            .select({ id: member.id })
            .from(member)
            .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
            .limit(1);

        if (organizationMembership.length === 0) {
            return NextResponse.json({ error: "User is not a member of this organization" }, { status: 400 });
        }

        // Check if already a team member
        const existingTeamMember = await db
            .select({ id: teamMember.id })
            .from(teamMember)
            .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
            .limit(1);

        if (existingTeamMember.length > 0) {
            return NextResponse.json({ error: "User is already a member of this team" }, { status: 400 });
        }

        const newMember = await extendedAuthApi.addTeamMember({
            body: { teamId, userId },
            headers: authResult.headers,
        });
        const memberPayload =
            (newMember as { member?: unknown } | null)?.member ?? newMember;

        return NextResponse.json({ member: memberPayload }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "add team member");
    }
}
