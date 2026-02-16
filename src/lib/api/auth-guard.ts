import { auth } from "@/lib/auth";
import { extendedAuthApi, type PermissionStatements } from "@/lib/auth-api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { Session, User } from "better-auth";

type AuthUser = User & {
    role?: string | null;
};

/**
 * Result type for authentication guard functions
 */
export type AuthResult =
    | { success: true; session: Session; user: AuthUser; headers: Headers }
    | { success: false; response: NextResponse };

export type AdminAction =
    | "users.list"
    | "users.create"
    | "users.update"
    | "users.set-role"
    | "users.set-password"
    | "users.ban"
    | "users.delete"
    | "users.impersonate"
    | "sessions.list"
    | "sessions.revoke"
    | "organizations.list"
    | "organizations.create"
    | "organizations.read"
    | "organizations.update"
    | "organizations.delete"
    | "organization.members.list"
    | "organization.members.manage"
    | "organization.roles.list"
    | "organization.roles.manage"
    | "organization.invitations.list"
    | "organization.invitations.manage"
    | "organization.teams.list"
    | "organization.teams.read"
    | "organization.teams.manage"
    | "organization.teams.members.list"
    | "organization.teams.members.manage"
    | "applications.list"
    | "applications.manage"
    | "rbac.read";

const ADMIN_ACTION_ROLE_MATRIX: Record<AdminAction, readonly string[]> = {
    "users.list": ["admin"],
    "users.create": ["admin"],
    "users.update": ["admin"],
    "users.set-role": ["admin"],
    "users.set-password": ["admin"],
    "users.ban": ["admin"],
    "users.delete": ["admin"],
    "users.impersonate": ["admin"],
    "sessions.list": ["admin"],
    "sessions.revoke": ["admin"],
    "organizations.list": ["admin"],
    "organizations.create": ["admin"],
    "organizations.read": ["admin"],
    "organizations.update": ["admin"],
    "organizations.delete": ["admin"],
    "organization.members.list": ["admin"],
    "organization.members.manage": ["admin"],
    "organization.roles.list": ["admin"],
    "organization.roles.manage": ["admin"],
    "organization.invitations.list": ["admin"],
    "organization.invitations.manage": ["admin"],
    "organization.teams.list": ["admin"],
    "organization.teams.read": ["admin"],
    "organization.teams.manage": ["admin"],
    "organization.teams.members.list": ["admin"],
    "organization.teams.members.manage": ["admin"],
    "applications.list": ["admin"],
    "applications.manage": ["admin"],
    "rbac.read": ["admin"],
};

const ADMIN_ACTION_PERMISSION_MATRIX: Partial<
    Record<AdminAction, PermissionStatements>
> = {
    "users.list": { user: ["list"] },
    "users.create": { user: ["create"] },
    "users.update": { user: ["update"] },
    "users.set-role": { user: ["set-role"] },
    "users.set-password": { user: ["set-password"] },
    "users.ban": { user: ["ban"] },
    "users.delete": { user: ["delete"] },
    "users.impersonate": { user: ["impersonate"] },
    "sessions.list": { session: ["list"] },
    "sessions.revoke": { session: ["revoke"] },
};

function normalizeRoleSet(role: string | null | undefined): Set<string> {
    if (!role) return new Set();
    return new Set(
        role
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean),
    );
}

function matchesRoleMatrix(roleSet: Set<string>, action: AdminAction): boolean {
    const allowedRoles = ADMIN_ACTION_ROLE_MATRIX[action];
    return allowedRoles.some((role) => roleSet.has(role));
}

async function hasPermissionForAction(
    action: AdminAction,
    requestHeaders: Headers,
    userId: string,
): Promise<boolean> {
    const permissions = ADMIN_ACTION_PERMISSION_MATRIX[action];
    if (!permissions) {
        return true;
    }

    try {
        const result = await extendedAuthApi.userHasPermission({
            body: {
                userId,
                permissions,
            },
            headers: requestHeaders,
        });
        return result.success === true;
    } catch {
        return false;
    }
}

/**
 * Requires the user to be authenticated with admin role.
 * Returns the session if successful, or an unauthorized response if not.
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await requireAdmin();
 *   if (!authResult.success) return authResult.response;
 *
 *   // Access session via authResult.session
 *   const userId = authResult.user.id;
 *   // ... business logic
 * }
 * ```
 */
export async function requireAdmin(): Promise<AuthResult> {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });
    const userRole = (session?.user as AuthUser | undefined)?.role;

    if (!session || userRole !== "admin") {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    return {
        success: true,
        session: session.session,
        user: session.user as AuthUser,
        headers: requestHeaders,
    };
}

export async function requireAdminAction(action: AdminAction): Promise<AuthResult> {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session) {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const user = session.user as AuthUser;
    const roleSet = normalizeRoleSet(user.role);

    if (!matchesRoleMatrix(roleSet, action)) {
        return {
            success: false,
            response: NextResponse.json(
                { error: `Forbidden for action: ${action}` },
                { status: 403 },
            ),
        };
    }

    const hasPermission = await hasPermissionForAction(
        action,
        requestHeaders,
        user.id,
    );
    if (!hasPermission) {
        return {
            success: false,
            response: NextResponse.json(
                { error: `Insufficient permission for action: ${action}` },
                { status: 403 },
            ),
        };
    }

    return {
        success: true,
        session: session.session,
        user,
        headers: requestHeaders,
    };
}

/**
 * Requires the user to be authenticated (any role).
 * Returns the session if successful, or an unauthorized response if not.
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await requireAuth();
 *   if (!authResult.success) return authResult.response;
 *
 *   // Access session via authResult.session
 *   const userId = authResult.user.id;
 *   // ... business logic
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session) {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    return {
        success: true,
        session: session.session,
        user: session.user as AuthUser,
        headers: requestHeaders,
    };
}
