import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member, organizationRole } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { extendedAuthApi, type PermissionStatements } from "@/lib/auth-api";
import { BUILT_IN_ORGANIZATION_ROLES } from "@/lib/built-in-organization-role-permissions";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ organizationId: string; roleId: string }>;
}

const BUILT_IN_ROLE_NAMES = new Set(
    BUILT_IN_ORGANIZATION_ROLES.map((r) => r.role),
);

async function getOrganizationMembership(userId: string, organizationId: string) {
    const result = await db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(
            and(
                eq(member.userId, userId),
                eq(member.organizationId, organizationId),
            ),
        )
        .limit(1);
    return result[0] ?? null;
}

async function verifyCustomRole(roleId: string, organizationId: string) {
    const result = await db
        .select({ id: organizationRole.id, role: organizationRole.role })
        .from(organizationRole)
        .where(
            and(
                eq(organizationRole.id, roleId),
                eq(organizationRole.organizationId, organizationId),
            ),
        )
        .limit(1);
    return result[0] ?? null;
}

// GET /api/user/organizations/[organizationId]/roles/[roleId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, roleId } = await params;
    const membership = await getOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        // Check if it's a built-in role
        const builtIn = BUILT_IN_ORGANIZATION_ROLES.find((r) => r.id === roleId);
        if (builtIn) {
            return NextResponse.json({
                role: {
                    id: builtIn.id,
                    role: builtIn.role,
                    description: builtIn.description,
                    permissions: builtIn.permissions as Record<string, string[]>,
                    isBuiltIn: true,
                    createdAt: null,
                    updatedAt: null,
                },
                canWrite: false, // built-in roles are never editable
            });
        }

        // Custom role from DB
        const result = await db
            .select()
            .from(organizationRole)
            .where(
                and(
                    eq(organizationRole.id, roleId),
                    eq(organizationRole.organizationId, organizationId),
                ),
            )
            .limit(1);

        if (result.length === 0) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        const role = result[0];
        const canWrite = membership.role === "owner" || membership.role === "admin";

        function parsePermission(raw: string | null | undefined): Record<string, string[]> {
            if (!raw) return {};
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") return parsed;
            } catch { /* ignore */ }
            return {};
        }

        return NextResponse.json({
            role: {
                id: role.id,
                role: role.role,
                permissions: parsePermission(role.permission),
                isBuiltIn: false,
                createdAt: role.createdAt,
                updatedAt: role.updatedAt,
            },
            canWrite,
        });
    } catch (error) {
        return handleApiError(error, "fetch organization role detail");
    }
}


export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, roleId } = await params;
    const membership = await getOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (membership.role !== "owner" && membership.role !== "admin") {
        return NextResponse.json({ error: "Only owner or admin can manage roles" }, { status: 403 });
    }

    const roleRecord = await verifyCustomRole(roleId, organizationId);
    if (!roleRecord) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    try {
        const body = await request.json();
        const schema = z.object({
            role: z.string().trim().min(1).max(100).optional(),
            permission: z.record(z.string(), z.array(z.string())).optional(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const { role, permission } = result.data;

        if (role && BUILT_IN_ROLE_NAMES.has(role.toLowerCase())) {
            return NextResponse.json(
                { error: `Cannot rename to built-in name: ${role}` },
                { status: 400 },
            );
        }

        const updateData: { role?: string; permission?: PermissionStatements } = {};
        if (role) updateData.role = role;
        if (permission !== undefined) updateData.permission = permission as PermissionStatements;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const updatedRaw = await extendedAuthApi.updateOrganizationRole({
            body: {
                organizationId,
                roleId,
                data: updateData,
            },
            headers: authResult.headers,
        });

        const updated = ((updatedRaw as { role?: unknown } | null)?.role ?? updatedRaw) as {
            id?: string;
            role?: string;
            permission?: unknown;
            createdAt?: string | Date;
            updatedAt?: string | Date | null;
        };

        function parsePermission(raw: unknown): Record<string, string[]> {
            if (!raw) return {};
            if (typeof raw === "string") {
                try {
                    const p = JSON.parse(raw);
                    if (p && typeof p === "object") return p;
                } catch { /* ignore */ }
                return {};
            }
            if (typeof raw === "object") return raw as Record<string, string[]>;
            return {};
        }

        return NextResponse.json({
            role: {
                id: updated.id ?? roleId,
                role: updated.role ?? role ?? roleRecord.role,
                permissions: parsePermission(updated.permission),
                isBuiltIn: false,
                createdAt: updated.createdAt ?? null,
                updatedAt: updated.updatedAt ?? null,
            },
        });
    } catch (error) {
        return handleApiError(error, "update organization role");
    }
}

// DELETE /api/user/organizations/[organizationId]/roles/[roleId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId, roleId } = await params;
    const membership = await getOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (membership.role !== "owner" && membership.role !== "admin") {
        return NextResponse.json({ error: "Only owner or admin can manage roles" }, { status: 403 });
    }

    const roleRecord = await verifyCustomRole(roleId, organizationId);
    if (!roleRecord) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    try {
        await extendedAuthApi.deleteOrganizationRole({
            body: {
                organizationId,
                roleId,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete organization role");
    }
}
