import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createEmailVerificationToken } from "better-auth/api";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

const schema = z.object({
  newEmail: z.string().email(),
  callbackURL: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { userId: rawUserId } = await context.params;
    const userId = rawUserId?.trim();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { newEmail } = parsed.data;
    const normalizedEmail = newEmail.trim().toLowerCase();

    const ctx = await auth.$context;
    if (!ctx.options.user?.changeEmail?.enabled) {
      return NextResponse.json(
        { error: "Change email is disabled" },
        { status: 400 },
      );
    }

    const targetUser = await ctx.internalAdapter.findUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentEmail = targetUser.email?.trim().toLowerCase() ?? "";
    if (!currentEmail) {
      return NextResponse.json(
        { error: "User does not have an email" },
        { status: 400 },
      );
    }

    const adminEmail = authResult.user.email?.trim().toLowerCase() ?? "";
    const emailMismatch = adminEmail !== "" && adminEmail !== currentEmail;

    if (normalizedEmail === currentEmail) {
      return NextResponse.json({ error: "Email is the same" }, { status: 400 });
    }

    const existingUser =
      await ctx.internalAdapter.findUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 422 },
      );
    }

    const callbackURL = parsed.data.callbackURL
      ? encodeURIComponent(parsed.data.callbackURL)
      : encodeURIComponent("/");

    const sendConfirmation =
      ctx.options.user.changeEmail.sendChangeEmailConfirmation ||
      ctx.options.user.changeEmail.sendChangeEmailVerification;

    if (sendConfirmation) {
      const token = await createEmailVerificationToken(
        ctx.secret,
        currentEmail,
        normalizedEmail,
        ctx.options.emailVerification?.expiresIn,
        { requestType: "change-email-confirmation" },
      );
      const url = `${ctx.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`;

      await ctx.runInBackgroundOrAwait(
        sendConfirmation(
          {
            user: targetUser,
            newEmail: normalizedEmail,
            url,
            token,
          },
          request,
        ),
      );

      return NextResponse.json({ status: true, emailMismatch });
    }

    if (!ctx.options.emailVerification?.sendVerificationEmail) {
      return NextResponse.json(
        { error: "Verification email is not enabled" },
        { status: 400 },
      );
    }

    const token = await createEmailVerificationToken(
      ctx.secret,
      currentEmail,
      normalizedEmail,
      ctx.options.emailVerification?.expiresIn,
      { requestType: "change-email-verification" },
    );
    const url = `${ctx.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`;

    await ctx.runInBackgroundOrAwait(
      ctx.options.emailVerification.sendVerificationEmail(
        {
          user: {
            ...targetUser,
            email: normalizedEmail,
          },
          url,
          token,
        },
        request,
      ),
    );

    return NextResponse.json({ status: true, emailMismatch });
  } catch (error) {
    return handleApiError(error, "trigger email change verification");
  }
}
