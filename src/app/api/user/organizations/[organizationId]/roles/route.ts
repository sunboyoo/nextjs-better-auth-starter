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
    params: Promise<{ organizationId: string }>;
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

function parsePermission(raw: string | null | undefined): Record<string, string[]> {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
    } catch { /* ignore */ }
    return {};
}

// GET /api/user/organizations/[organizationId]/roles
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;
    const membership = await getOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    try {
        // Fetch custom roles from DB
        const customRoles = await db
            .select()
            .from(organizationRole)
            .where(eq(organizationRole.organizationId, organizationId));

        const builtInRoles = BUILT_IN_ORGANIZATION_ROLES.map((r) => ({
            id: r.id,
            role: r.role,
            description: r.description,
            permissions: r.permissions as Record<string, string[]>,
            isBuiltIn: true,
            createdAt: null,
            updatedAt: null,
        }));

        const custom = customRoles.map((r) => ({
            id: r.id,
            role: r.role,
            permissions: parsePermission(r.permission),
            isBuiltIn: false,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));

        const canWrite =
            membership.role === "owner" || membership.role === "admin";

        return NextResponse.json({
            builtInRoles,
            customRoles: custom,
            canWrite,
        });
    } catch (error) {
        return handleApiError(error, "fetch organization roles");
    }
}

// POST /api/user/organizations/[organizationId]/roles
export async function POST(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { organizationId } = await params;
    const membership = await getOrganizationMembership(authResult.user.id, organizationId);
    if (!membership) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }
    if (membership.role !== "owner" && membership.role !== "admin") {
        return NextResponse.json({ error: "Only owner or admin can manage roles" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const schema = z.object({
            role: z.string().trim().min(1).max(100),
            permission: z.record(z.string(), z.array(z.string())).optional(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const { role, permission } = result.data;

        if (BUILT_IN_ROLE_NAMES.has(role.toLowerCase())) {
            return NextResponse.json(
                { error: `Cannot create role with built-in name: ${role}` },
                { status: 400 },
            );
        }

        const newRole = await extendedAuthApi.createOrganizationRole({
            body: {
                organizationId,
                role,
                permission: permission as PermissionStatements | undefined,
            },
            headers: authResult.headers,
        });

        const created = ((newRole as { role?: unknown } | null)?.role ?? newRole) as {
            id?: string;
            role?: string;
            permission?: unknown;
            createdAt?: string | Date;
            updatedAt?: string | Date | null;
        };

        return NextResponse.json(
            {
                role: {
                    id: created.id,
                    role: created.role ?? role,
                    permissions: typeof created.permission === "string"
                        ? parsePermission(created.permission)
                        : (created.permission ?? permission ?? {}),
                    isBuiltIn: false,
                    createdAt: created.createdAt ?? null,
                    updatedAt: created.updatedAt ?? null,
                },
            },
            { status: 201 },
        );
    } catch (error) {
        return handleApiError(error, "create organization role");
    }
}
