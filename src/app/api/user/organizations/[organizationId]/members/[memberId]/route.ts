import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, member, teamMember, team } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

interface RouteParams {
    params: Promise<{ organizationId: string; memberId: string }>;
}

async function verifyOrganizationMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
        .limit(1);
    return memberRecord[0] ?? null;
}

// GET /api/user/organizations/[organizationId]/members/[memberId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, memberId } = await params;
    const currentMembership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!currentMembership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        // Fetch member record
        const memberResult = await db
            .select()
            .from(member)
            .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
            .limit(1);

        if (memberResult.length === 0) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        const memberRecord = memberResult[0];

        // Fetch user info
        const userResult = await db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
            })
            .from(user)
            .where(eq(user.id, memberRecord.userId))
            .limit(1);

        // Fetch teams this member belongs to (within this organization)
        const organizationTeams = await db
            .select({ id: team.id, name: team.name })
            .from(team)
            .where(eq(team.organizationId, organizationId));

        const memberTeams: { teamId: string; teamName: string; joinedAt: Date }[] = [];
        if (organizationTeams.length > 0) {
            const teamMemberships = await db
                .select()
                .from(teamMember)
                .where(eq(teamMember.userId, memberRecord.userId));

            const organizationTeamIds = new Set(organizationTeams.map((t) => t.id));
            const organizationTeamMap = new Map(organizationTeams.map((t) => [t.id, t.name]));

            for (const tm of teamMemberships) {
                if (organizationTeamIds.has(tm.teamId)) {
                    memberTeams.push({
                        teamId: tm.teamId,
                        teamName: organizationTeamMap.get(tm.teamId) ?? "Unknown",
                        joinedAt: tm.createdAt,
                    });
                }
            }
        }

        return NextResponse.json({
            member: {
                id: memberRecord.id,
                role: memberRecord.role,
                createdAt: memberRecord.createdAt,
                userId: memberRecord.userId,
                user: userResult[0] ?? null,
            },
            teams: memberTeams,
            canWrite: currentMembership.role === "owner" || currentMembership.role === "admin",
        });
    } catch (error) {
        return handleApiError(error, "fetch member detail");
    }
}
