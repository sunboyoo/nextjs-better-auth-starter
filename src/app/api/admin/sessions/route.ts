import { NextRequest, NextResponse } from "next/server";
import { getSessions } from "@/utils/sessions";
import { handleApiError } from "@/lib/api/error-handler";
import { requireAdmin } from "@/lib/api/auth-guard";
import { parsePagination } from "@/lib/api/pagination";

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (!authResult.success) return authResult.response;

        const searchParams = request.nextUrl.searchParams;
        const { page, limit, offset } = parsePagination(request);
        const email = searchParams.get("email") || undefined;
        const userId = searchParams.get("userId") || undefined;
        const activeOnly = searchParams.get("activeOnly") !== "false";

        const { sessions, total } = await getSessions({
            limit,
            offset,
            email,
            userId,
            activeOnly,
        });

        return NextResponse.json({
            sessions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error, "fetch sessions");
    }
}
