import { NextRequest, NextResponse } from "next/server";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { extendedAuthApi, type PermissionStatements } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

type OrganizationRoleApi = {
    id?: string;
    role?: string;
    permission?: unknown;
    createdAt?: string | Date;
    updatedAt?: string | Date | null;
    organizationId?: string;
};

function serializePermission(permission: unknown): string {
    if (typeof permission === "string") return permission;
    try {
        return JSON.stringify(permission ?? {});
    } catch {
        return "{}";
    }
}

function parsePermissionInput(permission: string | null | undefined): PermissionStatements | undefined {
    if (!permission) return undefined;
    try {
        const parsed = JSON.parse(permission) as PermissionStatements;
        if (parsed && typeof parsed === "object") {
            return parsed;
        }
    } catch {
        return undefined;
    }
    return undefined;
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; roleId: string }> }
) {
    const authResult = await requireAdminAction("organization.roles.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, roleId } = await params;

    try {
        await extendedAuthApi.deleteOrganizationRole({
            body: {
                organizationId,
                roleId,
            },
            headers: authResult.headers,
        });
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.roles.delete",
            targetType: "organization-role",
            targetId: roleId,
            metadata: { organizationId },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete role");
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; roleId: string }> }
) {
    const authResult = await requireAdminAction("organization.roles.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId, roleId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            role: z.string().trim().min(1).max(100).optional(),
            permission: z.string().trim().max(10000).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { role, permission } = result.data;
        const updateData: {
            role?: string;
            permission?: PermissionStatements;
        } = {};
        if (role) updateData.role = role;
        if (permission !== undefined) {
            updateData.permission = parsePermissionInput(permission) ?? {};
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const updatedRoleRaw = await extendedAuthApi.updateOrganizationRole({
            body: {
                organizationId,
                roleId,
                data: updateData,
            },
            headers: authResult.headers,
        });
        const updatedRole = ((updatedRoleRaw as { role?: unknown } | null)?.role ??
            updatedRoleRaw) as OrganizationRoleApi;
        const rolePayload = {
            id: updatedRole.id ?? roleId,
            organizationId: updatedRole.organizationId ?? organizationId,
            role: updatedRole.role ?? role ?? "",
            permission: serializePermission(updatedRole.permission),
            createdAt: updatedRole.createdAt ?? null,
            updatedAt: updatedRole.updatedAt ?? null,
        };
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.roles.update",
            targetType: "organization-role",
            targetId: roleId,
            metadata: {
                organizationId,
                fields: Object.keys(updateData),
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ role: rolePayload });
    } catch (error) {
        return handleApiError(error, "update role");
    }
}
