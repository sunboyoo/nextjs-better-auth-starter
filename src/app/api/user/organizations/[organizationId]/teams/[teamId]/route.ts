import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { team, teamMember, member } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

interface RouteParams {
    params: Promise<{ organizationId: string; teamId: string }>;
}

async function verifyOrgMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
        .limit(1);
    return memberRecord[0] ?? null;
}

// GET /api/user/organizations/[organizationId]/teams/[teamId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId } = await params;
    const membership = await verifyOrgMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        const teamResult = await db
            .select()
            .from(team)
            .where(eq(team.id, teamId))
            .limit(1);

        if (teamResult.length === 0 || teamResult[0].organizationId !== organizationId) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const memberCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(teamMember)
            .where(eq(teamMember.teamId, teamId));

        const memberCount = Number(memberCountResult[0]?.count ?? 0);

        return NextResponse.json({
            team: {
                ...teamResult[0],
                memberCount,
            },
            canWrite: membership.role === "owner" || membership.role === "admin",
        });
    } catch (error) {
        return handleApiError(error, "fetch team");
    }
}
