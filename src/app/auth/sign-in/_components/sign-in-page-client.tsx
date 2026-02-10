"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { ClientAuthenticationProfile } from "@/config/authentication/client";
import { Tabs } from "@/components/ui/tabs2";
import { authClient, isGoogleOneTapConfigured } from "@/lib/auth-client";
import { getCallbackURL } from "@/lib/better-auth-official/shared";
import { shouldShowSocialForStep } from "@/lib/authentication-profile-flow";
import SignIn from "./sign-in";
import { SignUp } from "./sign-up";

interface SignInPageClientProps {
  profile: ClientAuthenticationProfile;
}

export function SignInPageClient({ profile }: SignInPageClientProps) {
  const router = useRouter();
  const params = useSearchParams();
  const queryString = params.toString();
  const callbackURL = getCallbackURL(params);
  const requestQuery = useMemo(() => {
    if (!queryString) {
      return undefined;
    }

    return Object.fromEntries(new URLSearchParams(queryString).entries());
  }, [queryString]);

  const shouldShowStep1Social = shouldShowSocialForStep(profile, "step1");
  const allowOneTap = isGoogleOneTapConfigured && shouldShowStep1Social;

  useEffect(() => {
    if (!allowOneTap) {
      return;
    }

    authClient.oneTap({
      fetchOptions: {
        query: requestQuery,
        onError: (context) => {
          const message = context.error?.message || "An error occurred";
          toast.error(message);
        },
        onSuccess: () => {
          toast.success("Successfully signed in");
          router.push(callbackURL);
        },
      },
    });
  }, [allowOneTap, callbackURL, requestQuery, router]);

  return (
    <div className="w-full">
      <div className="flex items-center flex-col justify-center w-full md:py-10">
        <div className="w-full max-w-md">
          <Tabs
            tabs={[
              {
                title: "Sign In",
                value: "sign-in",
                content: <SignIn profile={profile} />,
              },
              {
                title: "Sign Up",
                value: "sign-up",
                content: <SignUp />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
