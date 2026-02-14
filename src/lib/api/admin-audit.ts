import "server-only";

import { db } from "@/db";
import { adminAuditLog } from "@/db/schema";

export type AdminAuditTargetType =
  | "user"
  | "session"
  | "organization"
  | "organization-member"
  | "organization-role"
  | "organization-invitation"
  | "team"
  | "team-member"
  | "app"
  | "resource"
  | "action"
  | "rbac";

type WriteAdminAuditLogInput = {
  actorUserId: string;
  action: string;
  targetType: AdminAuditTargetType;
  targetId?: string | null;
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

export async function writeAdminAuditLog(
  input: WriteAdminAuditLogInput,
): Promise<void> {
  const payload = {
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: sanitizeMetadata(input.metadata),
    ipAddress: normalizeIpAddress(input.headers),
    userAgent: input.headers?.get("user-agent") ?? null,
  };

  try {
    await db.insert(adminAuditLog).values(payload);
  } catch (error) {
    console.error("[admin-audit] failed to write audit log", {
      action: input.action,
      actorUserId: input.actorUserId,
      targetType: input.targetType,
      targetId: input.targetId,
      error,
    });
  }
}
