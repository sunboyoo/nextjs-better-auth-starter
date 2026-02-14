import { NextRequest, NextResponse } from "next/server";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

// DELETE /api/admin/organizations/[organizationId]/teams/[teamId]/members/[userId] - Remove team member
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; teamId: string; userId: string }> }
) {
    const authResult = await requireAdminAction("organization.teams.members.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, teamId, userId } = await params;

    try {
        await extendedAuthApi.removeTeamMember({
            body: { teamId, userId },
            headers: authResult.headers,
        });

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.teams.members.remove",
            targetType: "team-member",
            targetId: userId,
            metadata: { organizationId, teamId, userId },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "remove team member");
    }
}
