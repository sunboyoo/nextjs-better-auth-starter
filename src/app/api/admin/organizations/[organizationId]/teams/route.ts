import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { team, teamMember, organization } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

// GET /api/admin/organizations/[organizationId]/teams - List teams
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdminAction("organization.teams.list");
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;
    const pagination = parsePagination(request);

    try {
        // Verify organization exists
        const organizationRows = await db
            .select({ id: organization.id, name: organization.name, slug: organization.slug })
            .from(organization)
            .where(eq(organization.id, organizationId))
            .limit(1);

        if (organizationRows.length === 0) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // List teams via better-auth API
        const teamsRaw = await extendedAuthApi.listOrganizationTeams({
            query: { organizationId },
            headers: authResult.headers,
        });

        type TeamApi = {
            id?: string;
            name?: string;
            organizationId?: string;
            createdAt?: string | Date;
            updatedAt?: string | Date | null;
        };

        const teamsList = (Array.isArray(teamsRaw) ? teamsRaw : []) as TeamApi[];

        // Get member counts from DB
        const teamIds = teamsList
            .map((t) => t.id)
            .filter((id): id is string => typeof id === "string");

        let memberCountMap = new Map<string, number>();
        if (teamIds.length > 0) {
            const memberCounts = await db
                .select({
                    teamId: teamMember.teamId,
                    count: sql<number>`count(*)`,
                })
                .from(teamMember)
                .where(sql`${teamMember.teamId} IN ${teamIds}`)
                .groupBy(teamMember.teamId);
            memberCountMap = new Map(
                memberCounts.map((row) => [row.teamId, Number(row.count)])
            );
        }

        // Sort by createdAt descending
        const normalizedTeams = teamsList
            .filter((t): t is Required<Pick<TeamApi, "id" | "name">> & TeamApi => !!t.id && !!t.name)
            .map((t) => ({
                id: t.id,
                name: t.name,
                organizationId: t.organizationId ?? organizationId,
                createdAt: t.createdAt ?? null,
                updatedAt: t.updatedAt ?? null,
                memberCount: memberCountMap.get(t.id) ?? 0,
            }))
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            });

        const total = normalizedTeams.length;
        const teams = normalizedTeams.slice(
            pagination.offset,
            pagination.offset + pagination.limit
        );

        return NextResponse.json({
            organization: organizationRows[0],
            teams,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch teams");
    }
}

// POST /api/admin/organizations/[organizationId]/teams - Create team
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdminAction("organization.teams.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            name: z.string().trim().min(1).max(100),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { name } = result.data;

        const createdTeam = await extendedAuthApi.createTeam({
            body: { name, organizationId },
            headers: authResult.headers,
        });

        const teamPayload =
            (createdTeam as { team?: unknown } | null)?.team ?? createdTeam;

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.teams.create",
            targetType: "team",
            targetId: (teamPayload as { id?: string } | null)?.id ?? null,
            metadata: { organizationId, name },
            headers: authResult.headers,
        });

        return NextResponse.json({ team: teamPayload }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create team");
    }
}
