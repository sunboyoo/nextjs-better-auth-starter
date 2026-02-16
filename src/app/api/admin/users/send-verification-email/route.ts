import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createEmailVerificationToken } from "better-auth/api";
import { auth } from "@/lib/auth";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

const schema = z.object({
  email: z.string().email(),
  callbackURL: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAction("users.update");
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const adminEmail = authResult.user.email?.trim().toLowerCase() ?? "";
    const emailMismatch = normalizedEmail !== adminEmail;

    const ctx = await auth.$context;
    if (!ctx.options.emailVerification?.sendVerificationEmail) {
      return NextResponse.json(
        { error: "Verification email isn't enabled" },
        { status: 400 },
      );
    }

    const user = await ctx.internalAdapter.findUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json({
        status: true,
        emailMismatch,
        info: emailMismatch ? "EMAIL_MISMATCH" : undefined,
      });
    }

    const token = await createEmailVerificationToken(
      ctx.secret,
      normalizedEmail,
      undefined,
      ctx.options.emailVerification?.expiresIn,
    );
    const callbackURL = encodeURIComponent(
      getSafeCallbackUrl(parsed.data.callbackURL ?? null, "/"),
    );
    const url = `${ctx.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`;

    await ctx.runInBackgroundOrAwait(
      ctx.options.emailVerification.sendVerificationEmail(
        {
          user: user.user,
          url,
          token,
        },
        request,
      ),
    );
    await writeAdminAuditLog({
      actorUserId: authResult.user.id,
      action: "admin.users.send-verification-email",
      targetType: "user",
      targetId: user.user.id,
      metadata: {
        email: normalizedEmail,
        emailMismatch,
      },
      headers: authResult.headers,
    });

    return NextResponse.json({
      status: true,
      emailMismatch,
      info: emailMismatch ? "EMAIL_MISMATCH" : undefined,
    });
  } catch (error) {
    return handleApiError(error, "send verification email");
  }
}
