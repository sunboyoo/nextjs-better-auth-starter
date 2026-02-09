import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { requireAdmin } from "@/lib/api/auth-guard";

const userSessionsAdminApi = auth.api as unknown as {
    revokeUserSessions: (input: {
        body: { userId: string };
        headers: Headers;
    }) => Promise<unknown>;
};

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const authResult = await requireAdmin();
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
        await userSessionsAdminApi.revokeUserSessions({
            body: {
                userId,
            },
            headers: await headers(),
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
