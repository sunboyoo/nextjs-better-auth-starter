import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { handleApiError } from "@/lib/api/error-handler";

const invitationApi = auth.api as unknown as {
    getInvitation: (input: {
        query: { id: string };
        headers: Headers;
    }) => Promise<unknown>;
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // Use Better Auth's standard getInvitation API (requires session cookies)
        const invitation = await invitationApi.getInvitation({
            query: { id },
            headers: await headers(),
        });

        return NextResponse.json({ invitation });
    } catch (error) {
        return handleApiError(error, "get invitation");
    }
}
