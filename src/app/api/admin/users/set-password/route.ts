import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

const schema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { userId, newPassword } = parsed.data;
    const ctx = await auth.$context;
    const minPasswordLength = ctx.password.config.minPasswordLength;
    const maxPasswordLength = ctx.password.config.maxPasswordLength;

    if (newPassword.length < minPasswordLength) {
      return NextResponse.json(
        { error: "Password is too short" },
        { status: 400 },
      );
    }

    if (newPassword.length > maxPasswordLength) {
      return NextResponse.json(
        { error: "Password is too long" },
        { status: 400 },
      );
    }

    const user = await ctx.internalAdapter.findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const accounts = await ctx.internalAdapter.findAccounts(userId);
    const credentialAccount = accounts?.find(
      (account) => account.providerId === "credential",
    );

    const hashedPassword = await ctx.password.hash(newPassword);

    if (credentialAccount) {
      await ctx.internalAdapter.updatePassword(userId, hashedPassword);
    } else {
      await ctx.internalAdapter.createAccount({
        userId,
        providerId: "credential",
        accountId: userId,
        password: hashedPassword,
      });
    }

    return NextResponse.json({ status: true });
  } catch (error) {
    return handleApiError(error, "set user password");
  }
}
