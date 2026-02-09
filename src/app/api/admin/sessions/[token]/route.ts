import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { requireAdmin } from "@/lib/api/auth-guard";

const sessionAdminApi = auth.api as unknown as {
    revokeUserSession: (input: {
        body: { sessionToken: string };
        headers: Headers;
    }) => Promise<unknown>;
};

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const authResult = await requireAdmin();
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
        await sessionAdminApi.revokeUserSession({
            body: {
                sessionToken: token,
            },
            headers: await headers(),
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
