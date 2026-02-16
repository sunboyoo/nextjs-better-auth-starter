import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberApplicationRoles, applicationRoles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

// GET - Get all member role assignments for this application (batch)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; applicationId: string }> }
) {
    const authResult = await requireAdminAction("applications.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, applicationId } = await params;

    try {
        const assignments = await db
            .select({
                memberId: memberApplicationRoles.memberId,
                roleId: memberApplicationRoles.applicationRoleId,
                roleName: applicationRoles.name,
                roleKey: applicationRoles.key,
            })
            .from(memberApplicationRoles)
            .innerJoin(
                applicationRoles,
                eq(memberApplicationRoles.applicationRoleId, applicationRoles.id)
            )
            .where(
                eq(applicationRoles.applicationId, applicationId)
            );

        // Group by memberId
        const memberRoles: Record<string, Array<{ roleId: string; roleName: string; roleKey: string }>> = {};
        for (const assignment of assignments) {
            if (!memberRoles[assignment.memberId]) {
                memberRoles[assignment.memberId] = [];
            }
            memberRoles[assignment.memberId].push({
                roleId: assignment.roleId,
                roleName: assignment.roleName,
                roleKey: assignment.roleKey,
            });
        }

        return NextResponse.json({ memberRoles });
    } catch (error) {
        return handleApiError(error, "fetch member roles");
    }
}
