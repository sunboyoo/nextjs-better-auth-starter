import { redirect } from "next/navigation";

interface LegacyTwoFactorPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: LegacyTwoFactorPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
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

  const suffix = query.toString();
  redirect(suffix ? `/auth/sign-in/two-factor?${suffix}` : "/auth/sign-in/two-factor");
}
