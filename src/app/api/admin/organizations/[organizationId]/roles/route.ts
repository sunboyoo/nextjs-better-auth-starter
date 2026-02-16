import { NextRequest, NextResponse } from "next/server";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination, createPaginationMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { extendedAuthApi, type PermissionStatements } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

type OrganizationRoleApi = {
    id?: string;
    organizationId?: string;
    role?: string;
    permission?: unknown;
    createdAt?: string | Date;
    updatedAt?: string | Date | null;
};

type OrganizationMemberApi = {
    id?: string;
    role?: string;
    user?: {
        name?: string | null;
        image?: string | null;
        email?: string | null;
    };
};

function toTimestamp(value: string | Date | null | undefined): number {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdminAction("organization.roles.list");
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;
    const pagination = parsePagination(request);

    try {
        const organizationRaw = (await extendedAuthApi.getFullOrganization({
            query: { organizationId },
            headers: authResult.headers,
        })) as { id?: string; name?: string; slug?: string; logo?: string | null } | null;

        if (!organizationRaw?.id) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        const membersRaw = (await extendedAuthApi.listMembers({
            query: { organizationId },
            headers: authResult.headers,
        })) as unknown;
        const activeMembers = (Array.isArray(membersRaw)
            ? membersRaw
            : []) as OrganizationMemberApi[];

        const activeRoleMembers = activeMembers.reduce((acc, curr) => {
            if (!curr.role || !curr.id) {
                return acc;
            }
            if (!acc[curr.role]) {
                acc[curr.role] = [];
            }
            acc[curr.role].push({
                memberId: curr.id,
                user: {
                    name: curr.user?.name ?? "Unknown",
                    image: curr.user?.image ?? null,
                    email: curr.user?.email ?? "",
                },
            });
            return acc;
        }, {} as Record<string, { memberId: string; user: { name: string; image: string | null; email: string } }[]>);

        const rolesRaw = (await extendedAuthApi.listOrganizationRoles({
            query: { organizationId },
            headers: authResult.headers,
        })) as unknown;
        const normalizedRoles = (Array.isArray(rolesRaw)
            ? rolesRaw
            : ([] as unknown[]))
            .map((role) => {
                const row = role as OrganizationRoleApi;
                if (!row.id || !row.role) return null;
                return {
                    id: row.id,
                    organizationId: row.organizationId ?? organizationId,
                    role: row.role,
                    permission: serializePermission(row.permission),
                    createdAt: row.createdAt ?? null,
                    updatedAt: row.updatedAt ?? null,
                };
            })
            .filter(
                (
                    role,
                ): role is {
                    id: string;
                    organizationId: string;
                    role: string;
                    permission: string;
                    createdAt: string | Date | null;
                    updatedAt: string | Date | null;
                } => role !== null,
            )
            .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));

        const total = normalizedRoles.length;
        const roles = normalizedRoles.slice(
            pagination.offset,
            pagination.offset + pagination.limit,
        );

        return NextResponse.json({
            organization: {
                id: organizationRaw.id,
                name: organizationRaw.name ?? "",
                slug: organizationRaw.slug ?? "",
                logo: organizationRaw.logo ?? null,
            },
            roles,
            activeRoleMembers,
            ...createPaginationMeta(total, pagination),
        });
    } catch (error) {
        return handleApiError(error, "fetch roles");
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const authResult = await requireAdminAction("organization.roles.manage");
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            role: z.string().trim().min(1).max(100),
            permission: z.string().trim().max(10000).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { role, permission } = result.data;

        if (!role) {
            return NextResponse.json({ error: "Role name is required" }, { status: 400 });
        }

        const newRole = await extendedAuthApi.createOrganizationRole({
            body: {
                organizationId,
                role,
                permission: parsePermissionInput(permission),
            },
            headers: authResult.headers,
        });
        const createdRole = ((newRole as { role?: unknown } | null)?.role ??
            newRole) as OrganizationRoleApi;
        const rolePayload = {
            id: createdRole.id ?? null,
            organizationId: createdRole.organizationId ?? organizationId,
            role: createdRole.role ?? role,
            permission: serializePermission(createdRole.permission),
            createdAt: createdRole.createdAt ?? null,
            updatedAt: createdRole.updatedAt ?? null,
        };
        await writeAdminAuditLog({
            actorUserId: authResult.user.id,
            action: "admin.organization.roles.create",
            targetType: "organization-role",
            targetId: createdRole.id ?? null,
            metadata: {
                organizationId,
                role,
            },
            headers: authResult.headers,
        });

        return NextResponse.json({ role: rolePayload }, { status: 201 });
    } catch (error) {
        return handleApiError(error, "create role");
    }
}
