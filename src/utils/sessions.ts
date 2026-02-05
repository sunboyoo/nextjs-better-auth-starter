import "server-only";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, ilike, count, and, gt } from "drizzle-orm";

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
    const { limit = 10, offset = 0, email, userId, activeOnly = true } = options;

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
