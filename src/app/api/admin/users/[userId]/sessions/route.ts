import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const authResult = await requireAdminAction("sessions.revoke");
        if (!authResult.success) return authResult.response;

        const { userId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Use the official Better Auth admin API to revoke all user sessions
        // This endpoint requires session cookies
        await extendedAuthApi.revokeUserSessions({
            body: {
                userId,
            },
            headers: authResult.headers,
        });
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.sessions.revoke-user-sessions",
            targetType: "user",
            targetId: userId,
            headers: authResult.headers,
        });

        return NextResponse.json({
            success: true,
            message: "All user sessions revoked successfully",
        });
    } catch (error) {
        console.error("Error trying to revoke user sessions:", error);
        return handleApiError(error, "revoke user sessions");
    }
}
