import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memberAppRoles, appRoles, member, user } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { z } from "zod";

// GET - Get member's assigned roles for this app
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; appId: string; memberId: string }> }
) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, memberId } = await params;

    try {
        // Verify member exists and belongs to the organization
        const memberRecord = await db
            .select({
                id: member.id,
                userId: member.userId,
                organizationId: member.organizationId,
                userName: sql<string>`(SELECT name FROM ${user} WHERE ${user.id} = ${member.userId})`,
                userEmail: sql<string>`(SELECT email FROM ${user} WHERE ${user.id} = ${member.userId})`,
            })
            .from(member)
            .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
            .limit(1);

        if (memberRecord.length === 0) {
            return NextResponse.json({ error: "Member not found in this organization" }, { status: 404 });
        }

        const assignedRoles = await db
            .select({
                roleId: memberAppRoles.appRoleId,
                createdAt: memberAppRoles.createdAt,
                roleKey: appRoles.key,
                roleName: appRoles.name,
            })
            .from(memberAppRoles)
            .innerJoin(appRoles, eq(memberAppRoles.appRoleId, appRoles.id))
            .where(
                and(
                    eq(memberAppRoles.memberId, memberId),
                    eq(appRoles.appId, appId)
                )
            );

        return NextResponse.json({
            member: memberRecord[0],
            roles: assignedRoles,
        });
    } catch (error) {
        return handleApiError(error, "fetch member roles");
    }
}

// POST - Assign role to member
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; appId: string; memberId: string }> }
) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, memberId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            roleId: z.string().trim().min(1).max(100).optional().nullable(),
            roleIds: z.array(z.string().trim().min(1).max(100)).optional(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { roleId, roleIds } = result.data;

        // Support both single roleId and array of roleIds
        const idsToAssign = roleIds || (roleId ? [roleId] : []);

        if (idsToAssign.length === 0) {
            return NextResponse.json(
                { error: "roleId or roleIds is required" },
                { status: 400 }
            );
        }

        // Verify member exists and belongs to the organization
        const memberRecord = await db
            .select({ id: member.id })
            .from(member)
            .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
            .limit(1);

        if (memberRecord.length === 0) {
            return NextResponse.json({ error: "Member not found in this organization" }, { status: 404 });
        }

        const insertedCount = { count: 0 };
        for (const id of idsToAssign) {
            // Verify role exists and belongs to this app
            const role = await db
                .select({ id: appRoles.id })
                .from(appRoles)
                .where(
                    and(
                        eq(appRoles.id, id),
                        eq(appRoles.appId, appId)
                    )
                )
                .limit(1);

            if (role.length === 0) {
                return NextResponse.json(
                    { error: `Role ${id} not found for this app` },
                    { status: 404 }
                );
            }

            // Check if already assigned
            const existing = await db
                .select({ memberId: memberAppRoles.memberId })
                .from(memberAppRoles)
                .where(
                    and(
                        eq(memberAppRoles.memberId, memberId),
                        eq(memberAppRoles.appRoleId, id)
                    )
                )
                .limit(1);

            if (existing.length === 0) {
                await db.insert(memberAppRoles).values({
                    memberId,
                    appRoleId: id,
                });
                insertedCount.count++;
            }
        }

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.members.app-roles.assign",
            targetType: "rbac",
            targetId: memberId,
            metadata: {
                organizationId,
                appId,
                memberId,
                roleIds: idsToAssign,
                assignedCount: insertedCount.count,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({
            success: true,
            assignedCount: insertedCount.count,
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "assign role");
    }
}

// DELETE - Remove role from member
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; appId: string; memberId: string }> }
) {
    const authResult = await requireAdminAction("apps.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, appId, memberId } = await params;
    const { searchParams } = request.nextUrl;
    const roleId = searchParams.get("roleId");

    if (!roleId) {
        return NextResponse.json(
            { error: "roleId is required" },
            { status: 400 }
        );
    }

    try {
        await db
            .delete(memberAppRoles)
            .where(
                and(
                    eq(memberAppRoles.memberId, memberId),
                    eq(memberAppRoles.appRoleId, roleId)
                )
            );

        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.members.app-roles.remove",
            targetType: "rbac",
            targetId: memberId,
            metadata: {
                organizationId,
                appId,
                memberId,
                roleId,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "remove role");
    }
}
