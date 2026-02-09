import { NextResponse } from "next/server";
import { db } from "@/db";
import { profileCompletion } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

const getProfileCompletionStorageError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string };
  if (
    dbError?.code === "42P01" ||
    dbError?.message?.includes('relation "profile_completion" does not exist')
  ) {
    return "Profile completion storage is not ready. Run pnpm db:push and try again.";
  }
  return null;
};

export async function POST() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const now = new Date();
    const updates: Partial<typeof profileCompletion.$inferInsert> = {
      currentStep: 4,
      completed: true,
      completedAt: now,
      updatedAt: now,
    };

    await db
      .insert(profileCompletion)
      .values({
        userId: authResult.user.id,
        ...updates,
      })
      .onConflictDoUpdate({
        target: profileCompletion.userId,
        set: updates,
      });

    return NextResponse.json({ status: true });
  } catch (error) {
    const storageError = getProfileCompletionStorageError(error);
    if (storageError) {
      return NextResponse.json({ error: storageError }, { status: 500 });
    }
    return handleApiError(error, "complete profile setup");
  }
}
