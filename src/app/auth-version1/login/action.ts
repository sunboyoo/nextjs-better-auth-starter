"use server";

import { auth } from "@/lib/auth";
import { APIError } from "better-auth/api";
import { ActionResult, loginSchema, LoginSchema } from "@/lib/schemas";

export async function loginUser(
  formData: LoginSchema,
): Promise<ActionResult<{ user: { id: string; email: string } }>> {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: { reason: parsed.error.issues[0]?.message || "Invalid input" },
    };
  }

  const { email, password } = parsed.data;
  try {
    await auth.api.signInEmail({ body: { email, password } });

    return {
      success: { reason: "Login successful" },
      error: null,
      data: undefined,
    };
  } catch (err) {
    if (err instanceof APIError) {
      return {
        error: { reason: err.message },
        success: null,
      };
    }

    return { error: { reason: "Something went wrong." }, success: null };
  }
}
