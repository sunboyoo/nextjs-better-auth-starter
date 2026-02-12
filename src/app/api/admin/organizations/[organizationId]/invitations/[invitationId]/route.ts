import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; invitationId: string }> }
) {
    const authResult = await requireAdminAction("organization.invitations.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, invitationId } = await params;

    try {
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
                error: "You must be a member of this organization to cancel invitations. Please add yourself as a member first using the 'Add Member' feature.",
                code: "NOT_ORG_MEMBER"
            }, { status: 403 });
        }

        // Use Better Auth's standard cancelInvitation API
        await extendedAuthApi.cancelInvitation({
            body: {
                invitationId,
            },
            headers: authResult.headers,
        });
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.invitations.cancel",
            targetType: "organization-invitation",
            targetId: invitationId,
            metadata: { organizationId },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "cancel invitation");
    }
}
