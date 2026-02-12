import { NextRequest, NextResponse } from "next/server";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; memberId: string }> }
) {
    const authResult = await requireAdminAction("organization.members.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, memberId } = await params;

    try {
        await extendedAuthApi.removeMember({
            body: {
                organizationId,
                memberIdOrEmail: memberId,
            },
            headers: authResult.headers,
        });
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.members.remove",
            targetType: "organization-member",
            targetId: memberId,
            metadata: { organizationId },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "remove member");
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; memberId: string }> }
) {
    const authResult = await requireAdminAction("organization.members.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, memberId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            role: z.string().trim().min(1).max(100),
        });
        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: parseResult.error.issues }, { status: 400 });
        }
        const { role: newRole } = parseResult.data;

        if (!newRole) {
            return NextResponse.json({ error: "Role is required" }, { status: 400 });
        }

        await extendedAuthApi.updateMemberRole({
            body: {
                organizationId,
                memberId,
                role: newRole,
            },
            headers: authResult.headers,
        });
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.members.update-role",
            targetType: "organization-member",
            targetId: memberId,
            metadata: { organizationId, role: newRole },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "update member role");
    }
}
