import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { actions, applications, member, resources } from "@/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

interface RouteParams {
    params: Promise<{ organizationId: string; applicationId: string }>;
}

async function verifyOrganizationMembership(userId: string, organizationId: string) {
    const memberRecord = await db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(
            and(
                eq(member.userId, userId),
                eq(member.organizationId, organizationId),
            ),
        )
        .limit(1);

    return memberRecord[0] ?? null;
}

async function verifyApplicationOwnership(applicationId: string, organizationId: string) {
    const application = await db
        .select({ id: applications.id, name: applications.name, key: applications.key })
        .from(applications)
        .where(
            and(
                eq(applications.id, applicationId),
                eq(applications.organizationId, organizationId),
            ),
        )
        .limit(1);

    return application[0] ?? null;
}

// GET /api/user/organizations/[organizationId]/applications/[applicationId]/actions
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId } = await params;
    const membership = await verifyOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json(
            { error: "Not a member of this organization" },
            { status: 403 },
        );
    }

    try {
        const application = await verifyApplicationOwnership(applicationId, organizationId);
        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";

        const conditions = search
            ? and(
                eq(resources.applicationId, applicationId),
                or(
                    ilike(actions.name, `%${search}%`),
                    ilike(actions.key, `%${search}%`),
                    ilike(resources.name, `%${search}%`),
                    ilike(resources.key, `%${search}%`),
                ),
            )
            : eq(resources.applicationId, applicationId);

        const rows = await db
            .select({
                id: actions.id,
                key: actions.key,
                name: actions.name,
                description: actions.description,
                createdAt: actions.createdAt,
                updatedAt: actions.updatedAt,
                resourceId: resources.id,
                resourceKey: resources.key,
                resourceName: resources.name,
            })
            .from(actions)
            .innerJoin(resources, eq(actions.resourceId, resources.id))
            .where(conditions)
            .orderBy(resources.name, actions.name);

        return NextResponse.json({
            application,
            actions: rows,
            total: rows.length,
            canWrite: membership.role === "owner" || membership.role === "admin",
        });
    } catch (error) {
        return handleApiError(error, "fetch application actions");
    }
}
