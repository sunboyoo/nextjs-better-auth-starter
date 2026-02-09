import { auth } from "@/lib/auth";
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
    | { success: true; session: Session; user: AuthUser }
    | { success: false; response: NextResponse };

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
    const session = await auth.api.getSession({
        headers: await headers(),
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
    const session = await auth.api.getSession({
        headers: await headers(),
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
    };
}
