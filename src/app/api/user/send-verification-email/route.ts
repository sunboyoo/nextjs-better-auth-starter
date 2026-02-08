import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createEmailVerificationToken } from "better-auth/api";
import { auth } from "@/lib/auth";
import {
  isSyntheticEmail,
  normalizeSyntheticEmailDomain,
} from "@/lib/auth-channel";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

const schema = z.object({
  callbackURL: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const ctx = await auth.$context;
    if (!ctx.options.emailVerification?.sendVerificationEmail) {
      return NextResponse.json(
        { error: "Verification email isn't enabled" },
        { status: 400 },
      );
    }

    const normalizedEmail =
      authResult.user.email?.trim().toLowerCase() ?? "";
    const syntheticEmailDomain = normalizeSyntheticEmailDomain(
      process.env.BETTER_AUTH_PHONE_TEMP_EMAIL_DOMAIN,
    );
    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (isSyntheticEmail(normalizedEmail, syntheticEmailDomain)) {
      return NextResponse.json(
        {
          error:
            "Email verification is unavailable for phone-first placeholder emails. Add a real email in account settings first.",
        },
        { status: 400 },
      );
    }

    const user = await ctx.internalAdapter.findUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.user.emailVerified) {
      return NextResponse.json({ status: true, alreadyVerified: true });
    }

    const token = await createEmailVerificationToken(
      ctx.secret,
      normalizedEmail,
      undefined,
      ctx.options.emailVerification?.expiresIn,
    );
    const callbackURL = parsed.data.callbackURL
      ? encodeURIComponent(parsed.data.callbackURL)
      : encodeURIComponent("/");
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

    return NextResponse.json({ status: true });
  } catch (error) {
    return handleApiError(error, "send verification email");
  }
}
