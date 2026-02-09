import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import { ProfileCompletionWizard } from "./_components/profile-completion-wizard";

interface ProfileCompletionPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

function getFirstQueryValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function ProfileCompletionPage({
  searchParams,
}: ProfileCompletionPageProps) {
  const params = await searchParams;
  const rawNext = getFirstQueryValue(params.next);
  const hasExplicitNext = Boolean(rawNext && rawNext.trim().length > 0);
  const safeNextUrl = getSafeCallbackUrl(rawNext, "/dashboard");
  const nextUrl =
    safeNextUrl === "/dashboard/profile-completion" ? "/dashboard" : safeNextUrl;

  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/dashboard/profile-completion");
  }

  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const requestOrigin = host ? `${protocol}://${host}` : null;
  const baseUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    requestOrigin ||
    "http://localhost:3000";

  const [accounts, completionResponse] = await Promise.all([
    auth.api.listUserAccounts({
      headers: requestHeaders,
    }),
    fetch(`${baseUrl}/api/user/profile-completion`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    }),
  ]);

  const completionPayload = completionResponse.ok
    ? ((await completionResponse.json()) as {
        data?: {
          currentStep?: number;
          completed?: boolean;
          stepIdentityData?: Record<string, unknown> | null;
          stepSecurityData?: Record<string, unknown> | null;
          stepRecoveryData?: Record<string, unknown> | null;
        } | null;
      })
    : null;
  const completionRow = completionPayload?.data ?? null;

  if (completionRow?.completed && hasExplicitNext) {
    redirect(nextUrl);
  }

  const hasPassword = accounts.some(
    (accountRow) => accountRow.providerId === "credential",
  );
  const recoveryMode =
    session.user.emailSource === "synthetic" ||
    session.user.emailDeliverable === false
      ? "email"
      : "phone";

  return (
    <ProfileCompletionWizard
      nextUrl={nextUrl}
      initialStep={
        completionRow?.completed && !hasExplicitNext
          ? 1
          : (completionRow?.currentStep ?? 1)
      }
      hasPassword={hasPassword}
      recoveryMode={recoveryMode}
      initialUser={{
        name: session.user.name,
        username: session.user.username ?? null,
        image: session.user.image ?? null,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        emailSource: session.user.emailSource ?? null,
        phoneNumber: session.user.phoneNumber ?? null,
        phoneNumberVerified: session.user.phoneNumberVerified ?? null,
      }}
      initialProgress={{
        stepIdentityData: completionRow?.stepIdentityData ?? null,
        stepSecurityData: completionRow?.stepSecurityData ?? null,
        stepRecoveryData: completionRow?.stepRecoveryData ?? null,
      }}
    />
  );
}
