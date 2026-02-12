import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

function toSafeSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
    const authResult = await requireAdminAction("organizations.read");
    if (!authResult.success) return authResult.response;

    const searchParams = request.nextUrl.searchParams;
    const rawSlug = searchParams.get("slug") || "";
    const excludeOrganizationId = searchParams.get("excludeOrganizationId");
    const slug = toSafeSlug(rawSlug);

    if (!slug) {
        return NextResponse.json(
            { error: "slug is required" },
            { status: 400 },
        );
    }

    try {
        const existing = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, slug))
            .limit(1);
        const takenBy = existing[0]?.id ?? null;
        const available =
            !takenBy ||
            (excludeOrganizationId !== null &&
                excludeOrganizationId !== undefined &&
                takenBy === excludeOrganizationId);

        return NextResponse.json({
            slug,
            available,
        });
    } catch (error) {
        return handleApiError(error, "check organization slug");
    }
}
