import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

const adminUsersApi = auth.api as unknown as {
  setUserPassword: (input: {
    body: {
      userId: string;
      newPassword: string;
    };
    headers: Headers;
  }) => Promise<{ status: boolean }>;
};

const schema = z.object({
  userId: z.string().trim().min(1),
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

    const result = await adminUsersApi.setUserPassword({
      body: parsed.data,
      headers: await headers(),
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "set user password");
  }
}
