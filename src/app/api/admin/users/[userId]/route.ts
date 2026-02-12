import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/error-handler";
import { requireAdmin } from "@/lib/api/auth-guard";

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
]);

const adminUsersApi = auth.api as unknown as {
  banUser: (input: {
    body: { userId: string; banReason?: string; banExpiresIn?: number };
    headers: Headers;
  }) => Promise<unknown>;
  unbanUser: (input: {
    body: { userId: string };
    headers: Headers;
  }) => Promise<unknown>;
  setRole: (input: {
    body: { userId: string; role: string | string[] };
    headers: Headers;
  }) => Promise<unknown>;
  adminUpdateUser: (input: {
    body: { userId: string; data: Record<string, unknown> };
    headers: Headers;
  }) => Promise<unknown>;
  removeUser: (input: {
    body: { userId: string };
    headers: Headers;
  }) => Promise<unknown>;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

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

    const requestHeaders = await headers();
    const action = parsed.data.action;

    if (action === "ban") {
      const result = await adminUsersApi.banUser({
        body: {
          userId,
          banReason: parsed.data.banReason,
          banExpiresIn: parsed.data.banExpiresIn,
        },
        headers: requestHeaders,
      });
      return NextResponse.json(result);
    }

    if (action === "unban") {
      const result = await adminUsersApi.unbanUser({
        body: { userId },
        headers: requestHeaders,
      });
      return NextResponse.json(result);
    }

    if (action === "set-role") {
      const result = await adminUsersApi.setRole({
        body: {
          userId,
          role: parsed.data.role,
        },
        headers: requestHeaders,
      });
      return NextResponse.json(result);
    }

    const result = await adminUsersApi.adminUpdateUser({
      body: {
        userId,
        data: parsed.data.data,
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
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const { userId: rawUserId } = await context.params;
    const userId = rawUserId?.trim();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const result = await adminUsersApi.removeUser({
      body: { userId },
      headers: await headers(),
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "delete user");
  }
}
