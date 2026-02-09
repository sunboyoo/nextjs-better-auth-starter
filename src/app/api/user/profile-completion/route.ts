import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { profileCompletion } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";

const updateProfileCompletionSchema = z.object({
  step: z.enum(["identity", "security", "recovery"]),
  skipped: z.boolean().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  nextStep: z.number().int().min(1).max(4).optional(),
});

const clampProfileStep = (step: number) => Math.max(1, Math.min(4, step));

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

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const row = await db
      .select({
        currentStep: profileCompletion.currentStep,
        completed: profileCompletion.completed,
        stepIdentityData: profileCompletion.stepIdentityData,
        stepSecurityData: profileCompletion.stepSecurityData,
        stepRecoveryData: profileCompletion.stepRecoveryData,
      })
      .from(profileCompletion)
      .where(eq(profileCompletion.userId, authResult.user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    return NextResponse.json({
      status: true,
      data: row,
    });
  } catch (error) {
    const storageError = getProfileCompletionStorageError(error);
    if (storageError) {
      return NextResponse.json({ error: storageError }, { status: 500 });
    }
    return handleApiError(error, "load profile completion");
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = updateProfileCompletionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const now = new Date();
    const updates: Partial<typeof profileCompletion.$inferInsert> = {
      updatedAt: now,
    };

    if (parsed.data.step === "identity") {
      updates.stepIdentityData = parsed.data.data;
      updates.stepIdentitySkipped = parsed.data.skipped ?? false;
      updates.stepIdentitySavedAt = now;
    } else if (parsed.data.step === "security") {
      updates.stepSecurityData = parsed.data.data;
      updates.stepSecuritySkipped = parsed.data.skipped ?? false;
      updates.stepSecuritySavedAt = now;
    } else {
      updates.stepRecoveryData = parsed.data.data;
      updates.stepRecoverySkipped = parsed.data.skipped ?? false;
      updates.stepRecoverySavedAt = now;
    }

    if (typeof parsed.data.nextStep === "number") {
      updates.currentStep = clampProfileStep(parsed.data.nextStep);
    }

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
    return handleApiError(error, "save profile completion step");
  }
}
