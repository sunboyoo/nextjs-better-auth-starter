import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, member, invitation, team } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

interface RouteParams {
    params: Promise<{ organizationId: string; invitationId: string }>;
}

async function verifyOrganizationMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
        .limit(1);
    return memberRecord[0] ?? null;
}

// GET /api/user/organizations/[organizationId]/invitations/[invitationId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, invitationId } = await params;
    const currentMembership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!currentMembership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        // Fetch invitation
        const invitationResult = await db
            .select()
            .from(invitation)
            .where(
                and(
                    eq(invitation.id, invitationId),
                    eq(invitation.organizationId, organizationId),
                ),
            )
            .limit(1);

        if (invitationResult.length === 0) {
            return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
        }

        const inv = invitationResult[0];

        // Fetch inviter user info
        const inviterResult = await db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
            })
            .from(user)
            .where(eq(user.id, inv.inviterId))
            .limit(1);

        // Fetch team info if teamId exists
        let teamInfo: { id: string; name: string } | null = null;
        if (inv.teamId) {
            const teamResult = await db
                .select({ id: team.id, name: team.name })
                .from(team)
                .where(eq(team.id, inv.teamId))
                .limit(1);
            teamInfo = teamResult[0] ?? null;
        }

        // Check if expired
        const isExpired =
            inv.status === "pending" && new Date(inv.expiresAt) < new Date();

        return NextResponse.json({
            invitation: {
                id: inv.id,
                email: inv.email,
                role: inv.role,
                status: inv.status,
                expiresAt: inv.expiresAt,
                createdAt: inv.createdAt,
                inviterId: inv.inviterId,
                teamId: inv.teamId,
                isExpired,
            },
            inviter: inviterResult[0] ?? null,
            team: teamInfo,
            canWrite:
                currentMembership.role === "owner" ||
                currentMembership.role === "admin",
        });
    } catch (error) {
        return handleApiError(error, "fetch invitation detail");
    }
}
