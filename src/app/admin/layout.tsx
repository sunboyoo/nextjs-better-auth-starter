import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DashboardLayout from "@/components/admin/dashboard-layout";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  let session;
  try {
    session = await auth.api.getSession({
      headers: requestHeaders,
    });
  } catch (error) {
    // Diagnostic logging to surface the real error behind the perf.measure crash.
    console.error("[AdminLayout] getSession failed", {
      hasCookie: Boolean(requestHeaders.get("cookie")),
      env: {
        DATABASE_URL_SET: Boolean(process.env.DATABASE_URL),
        BETTER_AUTH_URL_SET: Boolean(process.env.BETTER_AUTH_URL),
        BETTER_AUTH_SECRET_SET: Boolean(process.env.BETTER_AUTH_SECRET),
      },
    });
    throw error;
  }

  if (!session) {
    return redirect("/auth/login");
  }

  if (session.user.role !== "admin") {
    return redirect("/dashboard");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
