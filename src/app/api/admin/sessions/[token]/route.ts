import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const authResult = await requireAdminAction("sessions.revoke");
        if (!authResult.success) return authResult.response;

        const { token } = await params;

        if (!token) {
            return NextResponse.json(
                { error: "Session token is required" },
                { status: 400 }
            );
        }

        // Use the official Better Auth admin API to revoke the session
        // This endpoint requires session cookies
        await extendedAuthApi.revokeUserSession({
            body: {
                sessionToken: token,
            },
            headers: authResult.headers,
        });
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.sessions.revoke-session",
            targetType: "session",
            targetId: token,
            headers: authResult.headers,
        });

        return NextResponse.json({
            success: true,
            message: "Session revoked successfully",
        });
    } catch (error) {
        console.error("Error trying to revoke session:", error);
        return handleApiError(error, "revoke session");
    }
}
