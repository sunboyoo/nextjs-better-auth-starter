import "server-only";

import { db } from "@/db";
import { userSecurityAuditLog } from "@/db/schema";

export type UserSecurityAuditAction =
  | "user.email.change.requested"
  | "user.password.changed"
  | "user.password.set"
  | "user.password.reset"
  | "user.account.delete.requested"
  | "user.session.revoke"
  | "user.sessions.revoke-other"
  | "user.account.unlink";

type WriteUserSecurityAuditLogInput = {
  actorUserId: string;
  action: UserSecurityAuditAction;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
  headers?: Headers;
};

function normalizeIpAddress(headers?: Headers): string | null {
  if (!headers) return null;
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstForwarded = xForwardedFor.split(",")[0]?.trim();
    if (firstForwarded) return firstForwarded;
  }
  const xRealIp = headers.get("x-real-ip")?.trim();
  if (xRealIp) return xRealIp;
  const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;
  return null;
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!metadata) return null;
  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined);
  if (!entries.length) return null;
  return Object.fromEntries(entries);
}

export async function writeUserSecurityAuditLog(
  input: WriteUserSecurityAuditLogInput,
): Promise<void> {
  const payload = {
    actorUserId: input.actorUserId,
    action: input.action,
    targetUserId: input.targetUserId ?? null,
    metadata: sanitizeMetadata(input.metadata),
    ipAddress: normalizeIpAddress(input.headers),
    userAgent: input.headers?.get("user-agent") ?? null,
  };

  try {
    await db.insert(userSecurityAuditLog).values(payload);
  } catch (error) {
    console.error("[user-security-audit] failed to write audit log", {
      action: input.action,
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      error,
    });
  }
}
