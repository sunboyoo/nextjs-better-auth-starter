import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { team, teamMember } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

// GET /api/admin/organizations/[organizationId]/teams/[teamId] - Get team details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; teamId: string }> }
) {
    const authResult = await requireAdminAction("organization.teams.read");
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId } = await params;

    try {
        // Fetch team from DB directly
        const teamResult = await db
            .select()
            .from(team)
            .where(eq(team.id, teamId))
            .limit(1);

        if (teamResult.length === 0 || teamResult[0].organizationId !== organizationId) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Get member count
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
        });
    } catch (error) {
        return handleApiError(error, "fetch team");
    }
}

// PATCH /api/admin/organizations/[organizationId]/teams/[teamId] - Update team
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; teamId: string }> }
) {
    const authResult = await requireAdminAction("organization.teams.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100).optional(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const { name } = result.data;
        if (!name) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const updatedTeam = await extendedAuthApi.updateTeam({
            body: {
                teamId,
                data: { name },
            },
            headers: authResult.headers,
        });

        const teamPayload =
            (updatedTeam as { team?: unknown } | null)?.team ?? updatedTeam;

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.teams.update",
            targetType: "team",
            targetId: teamId,
            metadata: { organizationId, name },
            headers: authResult.headers,
        });

        return NextResponse.json({ team: teamPayload });
    } catch (error) {
        return handleApiError(error, "update team");
    }
}

// DELETE /api/admin/organizations/[organizationId]/teams/[teamId] - Remove team
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; teamId: string }> }
) {
    const authResult = await requireAdminAction("organization.teams.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId } = await params;

    try {
        await extendedAuthApi.removeTeam({
            body: { teamId, organizationId },
            headers: authResult.headers,
        });

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.teams.delete",
            targetType: "team",
            targetId: teamId,
            metadata: { organizationId },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete team");
    }
}
