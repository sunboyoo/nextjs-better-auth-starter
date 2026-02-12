import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/error-handler";
import { requireAdminAction, type AdminAction } from "@/lib/api/auth-guard";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

const patchBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ban"),
    banReason: z.string().optional(),
    banExpiresIn: z.number().int().positive().optional(),
  }),
  z.object({
    action: z.literal("unban"),
  }),
  z.object({
    action: z.literal("set-role"),
    role: z.union([z.string(), z.array(z.string())]),
  }),
  z.object({
    action: z.literal("update-user"),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal("impersonate"),
  }),
]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: rawUserId } = await context.params;
    const userId = rawUserId?.trim();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const action = parsed.data.action;
    const actionGuardMap: Record<typeof action, AdminAction> = {
      ban: "users.ban",
      unban: "users.ban",
      "set-role": "users.set-role",
      "update-user": "users.update",
      impersonate: "users.impersonate",
    };
    const authResult = await requireAdminAction(actionGuardMap[action]);
    if (!authResult.success) return authResult.response;
    const requestHeaders = authResult.headers;

    if (action === "ban") {
      const result = await extendedAuthApi.banUser({
        body: {
          userId,
          banReason: parsed.data.banReason,
          banExpiresIn: parsed.data.banExpiresIn,
        },
        headers: requestHeaders,
      });
      await writeAdminAuditLog({
        actorUserId: authResult.user.id,
        action: "admin.users.ban",
        targetType: "user",
        targetId: userId,
        metadata: {
          banReason: parsed.data.banReason ?? null,
          banExpiresIn: parsed.data.banExpiresIn ?? null,
        },
        headers: requestHeaders,
      });
      return NextResponse.json(result);
    }

    if (action === "unban") {
      const result = await extendedAuthApi.unbanUser({
        body: { userId },
        headers: requestHeaders,
      });
      await writeAdminAuditLog({
        actorUserId: authResult.user.id,
        action: "admin.users.unban",
        targetType: "user",
        targetId: userId,
        headers: requestHeaders,
      });
      return NextResponse.json(result);
    }

    if (action === "set-role") {
      const result = await extendedAuthApi.setRole({
        body: {
          userId,
          role: parsed.data.role,
        },
        headers: requestHeaders,
      });
      await writeAdminAuditLog({
        actorUserId: authResult.user.id,
        action: "admin.users.set-role",
        targetType: "user",
        targetId: userId,
        metadata: { role: parsed.data.role },
        headers: requestHeaders,
      });
      return NextResponse.json(result);
    }

    if (action === "impersonate") {
      const result = await extendedAuthApi.impersonateUser({
        body: { userId },
        headers: requestHeaders,
      });
      await writeAdminAuditLog({
        actorUserId: authResult.user.id,
        action: "admin.users.impersonate",
        targetType: "user",
        targetId: userId,
        headers: requestHeaders,
      });
      return NextResponse.json(result);
    }

    const result = await extendedAuthApi.adminUpdateUser({
      body: {
        userId,
        data: parsed.data.data,
      },
      headers: requestHeaders,
    });
    await writeAdminAuditLog({
      actorUserId: authResult.user.id,
      action: "admin.users.update",
      targetType: "user",
      targetId: userId,
      metadata: {
        fields: Object.keys(parsed.data.data),
      },
      headers: requestHeaders,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "update user");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const authResult = await requireAdminAction("users.delete");
  if (!authResult.success) return authResult.response;

  try {
    const { userId: rawUserId } = await context.params;
    const userId = rawUserId?.trim();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const result = await extendedAuthApi.removeUser({
      body: { userId },
      headers: authResult.headers,
    });
    await writeAdminAuditLog({
      actorUserId: authResult.user.id,
      action: "admin.users.delete",
      targetType: "user",
      targetId: userId,
      headers: authResult.headers,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "delete user");
  }
}
