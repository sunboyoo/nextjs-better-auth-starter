import { Suspense } from "react";
import { getActiveAuthenticationProfileClientServer } from "@/config/authentication/client";
import { SignInPageClient } from "./_components/sign-in-page-client";

export default function Page() {
  const profile = getActiveAuthenticationProfileClientServer();

  return (
    <Suspense fallback={null}>
      <SignInPageClient profile={profile} />
    </Suspense>
  );
}
