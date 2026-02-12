import "server-only";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, ilike, count, and, gt } from "drizzle-orm";
import { extendedAuthApi } from "@/lib/auth-api";

/**
 * Session with user information
 */
export interface SessionWithUser {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    impersonatedBy: string | null;
    activeOrganizationId: string | null;
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
}

/**
 * Options for fetching sessions
 */
export interface GetSessionsOptions {
    limit?: number;
    offset?: number;
    email?: string;
    userId?: string;
    activeOnly?: boolean;
    requestHeaders?: Headers;
}

function toDate(value: unknown): Date {
    if (value instanceof Date) return value;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

/**
 * Get all sessions with user information
 * 
 * Note: This uses direct database queries because Better Auth's 
 * `listUserSessions` API only supports fetching sessions for a single user.
 * For admin-level session management across all users, direct database
 * access is necessary.
 */
export async function getSessions(
    options: GetSessionsOptions = {}
): Promise<{ sessions: SessionWithUser[]; total: number }> {
    const {
        limit = 10,
        offset = 0,
        email,
        userId,
        activeOnly = true,
        requestHeaders,
    } = options;

    // Prefer Better Auth API semantics for single-user queries.
    if (userId && !email && requestHeaders) {
        try {
            const sessionResponse = await extendedAuthApi.listUserSessions({
                body: { userId },
                headers: requestHeaders,
            });
            const sessionsRaw =
                (sessionResponse as { sessions?: unknown[] } | null)?.sessions ?? [];
            const targetUser = await db
                .select({
                    id: schema.user.id,
                    name: schema.user.name,
                    email: schema.user.email,
                    image: schema.user.image,
                })
                .from(schema.user)
                .where(eq(schema.user.id, userId))
                .limit(1);
            const userInfo = targetUser[0] ?? null;

            const normalized = sessionsRaw
                .map((item) => {
                    const row = item as {
                        id?: string;
                        token?: string;
                        userId?: string;
                        expiresAt?: unknown;
                        createdAt?: unknown;
                        updatedAt?: unknown;
                        ipAddress?: string | null;
                        userAgent?: string | null;
                        impersonatedBy?: string | null;
                        activeOrganizationId?: string | null;
                    };

                    if (!row.id || !row.userId || !row.expiresAt || !row.createdAt || !row.updatedAt) {
                        return null;
                    }

                    return {
                        id: row.id,
                        token: row.token ?? "",
                        userId: row.userId,
                        expiresAt: toDate(row.expiresAt),
                        createdAt: toDate(row.createdAt),
                        updatedAt: toDate(row.updatedAt),
                        ipAddress: row.ipAddress ?? null,
                        userAgent: row.userAgent ?? null,
                        impersonatedBy: row.impersonatedBy ?? null,
                        activeOrganizationId: row.activeOrganizationId ?? null,
                        user: {
                            id: userInfo?.id ?? row.userId,
                            name: userInfo?.name ?? "",
                            email: userInfo?.email ?? "",
                            image: userInfo?.image ?? null,
                        },
                    } satisfies SessionWithUser;
                })
                .filter((session): session is SessionWithUser => session !== null)
                .filter((session) =>
                    activeOnly ? session.expiresAt.getTime() > Date.now() : true
                )
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            const total = normalized.length;
            return {
                sessions: normalized.slice(offset, offset + limit),
                total,
            };
        } catch {
            // Fall back to DB aggregation if the official endpoint is unavailable for this context.
        }
    }

    // Build WHERE conditions
    const conditions = [];

    if (activeOnly) {
        conditions.push(gt(schema.session.expiresAt, new Date()));
    }

    if (userId) {
        conditions.push(eq(schema.session.userId, userId));
    }

    if (email) {
        conditions.push(ilike(schema.user.email, `%${email}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
        .select({ count: count() })
        .from(schema.session)
        .innerJoin(schema.user, eq(schema.session.userId, schema.user.id))
        .where(whereClause);

    const total = countResult?.count ?? 0;

    // Get sessions with user info
    const rows = await db
        .select({
            id: schema.session.id,
            token: schema.session.token,
            userId: schema.session.userId,
            expiresAt: schema.session.expiresAt,
            createdAt: schema.session.createdAt,
            updatedAt: schema.session.updatedAt,
            ipAddress: schema.session.ipAddress,
            userAgent: schema.session.userAgent,
            impersonatedBy: schema.session.impersonatedBy,
            activeOrganizationId: schema.session.activeOrganizationId,
            userName: schema.user.name,
            userEmail: schema.user.email,
            userImage: schema.user.image,
        })
        .from(schema.session)
        .innerJoin(schema.user, eq(schema.session.userId, schema.user.id))
        .where(whereClause)
        .orderBy(desc(schema.session.createdAt))
        .limit(limit)
        .offset(offset);

    const sessions: SessionWithUser[] = rows.map((row) => ({
        id: row.id,
        token: row.token,
        userId: row.userId,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        impersonatedBy: row.impersonatedBy,
        activeOrganizationId: row.activeOrganizationId,
        user: {
            id: row.userId,
            name: row.userName,
            email: row.userEmail,
            image: row.userImage,
        },
    }));

    return { sessions, total };
}

/**
 * Get session count for a user
 */
export async function getUserSessionCount(userId: string): Promise<number> {
    const [result] = await db
        .select({ count: count() })
        .from(schema.session)
        .where(
            and(
                eq(schema.session.userId, userId),
                gt(schema.session.expiresAt, new Date())
            )
        );

    return result?.count ?? 0;
}
