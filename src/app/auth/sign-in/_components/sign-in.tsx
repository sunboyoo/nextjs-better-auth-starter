"use client";

import type { ReadonlyURLSearchParams } from "next/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import type { ClientAuthenticationProfile } from "@/config/authentication/client";
import type { AuthenticationMethod } from "@/config/authentication/types";
import { SignInForm } from "@/components/forms/sign-in-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCallbackURL } from "@/lib/better-auth-official/shared";
import {
  shouldShowSocialForStep,
  shouldUseIdentifierFirst,
} from "@/lib/authentication-profile-flow";
import {
  buildMagicLinkErrorCallbackURL,
  buildMagicLinkNewUserCallbackURL,
} from "@/lib/magic-link";
import { SignInIdentifyStep } from "./sign-in-identify-step";
import { SocialSignInButtons } from "./social-sign-in-buttons";

interface SignInProps {
  profile: ClientAuthenticationProfile;
}

function getSignInFormMethods(
  methods: readonly AuthenticationMethod[],
): readonly AuthenticationMethod[] {
  return methods.filter(
    (method) =>
      method === "password" ||
      method === "emailOtp" ||
      method === "smsOtp" ||
      method === "magicLink",
  );
}

function SingleScreenSignIn({
  profile,
  params,
}: {
  profile: ClientAuthenticationProfile;
  params: ReadonlyURLSearchParams;
}) {
  const router = useRouter();
  const callbackURL = getCallbackURL(params);
  const magicLinkNewUserCallbackURL =
    buildMagicLinkNewUserCallbackURL(callbackURL);
  const magicLinkErrorCallbackURL = buildMagicLinkErrorCallbackURL(callbackURL);
  const formMethods = getSignInFormMethods(profile.authenticate.methods);
  const showStep1Social = shouldShowSocialForStep(profile, "step1");

  return (
    <Card className="w-full rounded-none max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Sign in with the methods enabled for this authentication profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <SignInForm
            params={params}
            onSuccess={() => router.push(callbackURL)}
            callbackURL={callbackURL}
            magicLinkNewUserCallbackURL={magicLinkNewUserCallbackURL}
            magicLinkErrorCallbackURL={magicLinkErrorCallbackURL}
            allowedIdentifierTabs={profile.identify.identifiers}
            allowedMethods={formMethods}
          />

          {showStep1Social && (
            <>
              <div className="relative py-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    OR CONTINUE WITH SOCIAL
                  </span>
                </div>
              </div>

              <SocialSignInButtons callbackURL={callbackURL} params={params} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SignIn({ profile }: SignInProps) {
  const params = useSearchParams();

  if (shouldUseIdentifierFirst(profile)) {
    return <SignInIdentifyStep profile={profile} params={params} />;
  }

  return <SingleScreenSignIn profile={profile} params={params} />;
}
