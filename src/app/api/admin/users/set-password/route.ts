import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

const schema = z.object({
  userId: z.string().trim().min(1),
  newPassword: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAction("users.set-password");
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const result = await extendedAuthApi.setUserPassword({
      body: parsed.data,
      headers: authResult.headers,
    });
    await writeAdminAuditLog({
      actorUserId: authResult.user.id,
      action: "admin.users.set-password",
      targetType: "user",
      targetId: parsed.data.userId,
      headers: authResult.headers,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "set user password");
  }
}
