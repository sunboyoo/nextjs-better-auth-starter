import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, team, teamMember, member } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

interface RouteParams {
    params: Promise<{ organizationId: string; teamId: string; teamMemberId: string }>;
}

async function verifyOrganizationMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
        .limit(1);
    return memberRecord[0] ?? null;
}

// GET /api/user/organizations/[organizationId]/teams/[teamId]/members/[teamMemberId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId, teamMemberId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        // Verify team belongs to organization
        const teamResult = await db
            .select({ id: team.id, name: team.name, organizationId: team.organizationId })
            .from(team)
            .where(eq(team.id, teamId))
            .limit(1);

        if (teamResult.length === 0 || teamResult[0].organizationId !== organizationId) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Find team member
        const tmResult = await db
            .select()
            .from(teamMember)
            .where(and(eq(teamMember.id, teamMemberId), eq(teamMember.teamId, teamId)))
            .limit(1);

        if (tmResult.length === 0) {
            return NextResponse.json({ error: "Team member not found" }, { status: 404 });
        }

        // Get user info
        const userResult = await db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
            })
            .from(user)
            .where(eq(user.id, tmResult[0].userId))
            .limit(1);

        return NextResponse.json({
            teamMember: {
                ...tmResult[0],
                userName: userResult[0]?.name ?? null,
                userEmail: userResult[0]?.email ?? null,
                userImage: userResult[0]?.image ?? null,
            },
            team: { id: teamResult[0].id, name: teamResult[0].name },
            canWrite: membership.role === "owner" || membership.role === "admin",
        });
    } catch (error) {
        return handleApiError(error, "fetch team member");
    }
}

// DELETE /api/user/organizations/[organizationId]/teams/[teamId]/members/[teamMemberId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId, teamMemberId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (membership.role !== "owner" && membership.role !== "admin") {
        return NextResponse.json({ error: "Only owner or admin can remove team members" }, { status: 403 });
    }

    try {
        // Verify team belongs to organization
        const teamResult = await db
            .select({ id: team.id, organizationId: team.organizationId })
            .from(team)
            .where(eq(team.id, teamId))
            .limit(1);

        if (teamResult.length === 0 || teamResult[0].organizationId !== organizationId) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Verify team member exists
        const tmResult = await db
            .select({ id: teamMember.id })
            .from(teamMember)
            .where(and(eq(teamMember.id, teamMemberId), eq(teamMember.teamId, teamId)))
            .limit(1);

        if (tmResult.length === 0) {
            return NextResponse.json({ error: "Team member not found" }, { status: 404 });
        }

        await db.delete(teamMember).where(eq(teamMember.id, teamMemberId));

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "remove team member");
    }
}
