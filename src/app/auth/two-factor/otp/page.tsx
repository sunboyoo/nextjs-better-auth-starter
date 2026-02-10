import { redirect } from "next/navigation";

interface LegacyTwoFactorOtpPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({
  searchParams,
}: LegacyTwoFactorOtpPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = new URLSearchParams();
  query.set("factor", "emailOtp");

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (key === "factor") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      query.set(key, value);
    }
  }

  redirect(`/auth/sign-in/two-factor?${query.toString()}`);
}
