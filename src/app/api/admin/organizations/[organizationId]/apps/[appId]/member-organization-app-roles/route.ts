import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberAppRoles, appRoles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

// GET - Get all member role assignments for this app (batch)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; appId: string }> }
) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, appId } = await params;

    try {
        const assignments = await db
            .select({
                memberId: memberAppRoles.memberId,
                roleId: memberAppRoles.appRoleId,
                roleName: appRoles.name,
                roleKey: appRoles.key,
            })
            .from(memberAppRoles)
            .innerJoin(
                appRoles,
                eq(memberAppRoles.appRoleId, appRoles.id)
            )
            .where(
                eq(appRoles.appId, appId)
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
