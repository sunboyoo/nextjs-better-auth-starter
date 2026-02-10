"use client";

import { KeyRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ClientAuthenticationProfile } from "@/config/authentication/client";
import type { AuthenticationMethod } from "@/config/authentication/types";
import { SignInForm, type IdentifierTab } from "@/components/forms/sign-in-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildAuthPageUrl,
  getSignInFlowContext,
  isMethodCompatibleWithIdentifier,
  requiresIdentifierForMethod,
  shouldShowSocialForStep,
  shouldUseDedicatedBiometricPage,
  shouldUseIdentifierFirst,
} from "@/lib/authentication-profile-flow";
import { authClient } from "@/lib/auth-client";
import {
  buildMagicLinkErrorCallbackURL,
  buildMagicLinkNewUserCallbackURL,
} from "@/lib/magic-link";
import { SocialSignInButtons } from "./social-sign-in-buttons";

interface SignInMethodStepProps {
  profile: ClientAuthenticationProfile;
}

const SIGN_IN_FORM_METHODS: readonly AuthenticationMethod[] = [
  "password",
  "emailOtp",
  "smsOtp",
  "magicLink",
];

function resolveMethodAvailability(
  profile: ClientAuthenticationProfile,
  identifierType: IdentifierTab | null,
  hasIdentifier: boolean,
): readonly AuthenticationMethod[] {
  return profile.authenticate.methods.filter((method) => {
    if (requiresIdentifierForMethod(profile, method) && !hasIdentifier) {
      return false;
    }

    return isMethodCompatibleWithIdentifier(method, identifierType);
  });
}

export function SignInMethodStep({ profile }: SignInMethodStepProps) {
  const router = useRouter();
  const params = useSearchParams();
  const queryString = params.toString();
  const requestQuery = useMemo(
    () => Object.fromEntries(new URLSearchParams(queryString).entries()),
    [queryString],
  );
  const flowContext = useMemo(() => getSignInFlowContext(params), [params]);
  const { callbackUrl, identifierType, identifier } = flowContext;
  const hasIdentifier = Boolean(identifierType && identifier);
  const methods = useMemo(
    () =>
      resolveMethodAvailability(
        profile,
        (identifierType as IdentifierTab | null) ?? null,
        hasIdentifier,
      ),
    [hasIdentifier, identifierType, profile],
  );
  const hasMethodsRequiringIdentifier = profile.authenticate.methods.some((method) =>
    requiresIdentifierForMethod(profile, method),
  );

  const passkeyEnabled = methods.includes("passkey");
  const socialVisible =
    methods.includes("social") && shouldShowSocialForStep(profile, "step2");
  const signInFormMethods = methods.filter((method) =>
    SIGN_IN_FORM_METHODS.includes(method),
  );
  const fixedIdentifier =
    identifierType && identifier && identifierType !== "phone"
      ? { type: identifierType as IdentifierTab, value: identifier }
      : null;
  const canAutoAttemptPasskey =
    passkeyEnabled &&
    profile.authenticate.autoAttemptPasskey?.enabled === true &&
    !shouldUseDedicatedBiometricPage(profile);
  const [autoPasskeyFailed, setAutoPasskeyFailed] = useState(false);

  const identifyHref = buildAuthPageUrl(profile.pages.identify, {
    callbackUrl,
    identifierType: null,
    identifier: null,
  });

  useEffect(() => {
    if (!shouldUseIdentifierFirst(profile)) {
      router.replace(identifyHref);
    }
  }, [identifyHref, profile, router]);

  useEffect(() => {
    if (!canAutoAttemptPasskey) {
      return;
    }

    if (
      profile.authenticate.autoAttemptPasskey?.when === "supportedOnly" &&
      typeof window !== "undefined" &&
      !("PublicKeyCredential" in window)
    ) {
      return;
    }

    const autoAttemptStorageKey = `auth-profile:auto-passkey:${profile.id}:${identifierType ?? "none"}:${identifier ?? "none"}`;

    if (typeof window !== "undefined") {
      if (window.sessionStorage.getItem(autoAttemptStorageKey)) {
        return;
      }
      window.sessionStorage.setItem(autoAttemptStorageKey, "1");
    }

    void authClient.signIn
      .passkey({
        fetchOptions: {
          query: requestQuery,
          onSuccess() {
            toast.success("Successfully signed in");
            router.push(callbackUrl);
          },
          onError() {
            setAutoPasskeyFailed(true);
          },
        },
      });
  }, [
    callbackUrl,
    canAutoAttemptPasskey,
    identifier,
    identifierType,
    profile,
    requestQuery,
    router,
  ]);

  if (!hasIdentifier && hasMethodsRequiringIdentifier && !passkeyEnabled && !socialVisible) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Continue from the identify step before choosing an authentication method.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(identifyHref)} className="w-full">
              Back to Identify
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Choose how to sign in</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Only methods enabled by the active authentication profile are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {identifierType && identifier ? (
              <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                Using {identifierType}: <span className="font-medium text-foreground">{identifier}</span>
              </div>
            ) : null}

            {passkeyEnabled ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await authClient.signIn.passkey({
                      fetchOptions: {
                        query: requestQuery,
                        onSuccess() {
                          toast.success("Successfully signed in");
                          router.push(callbackUrl);
                        },
                        onError(context) {
                          toast.error(
                            context.error.message ||
                            "Passkey sign-in failed. Try another method.",
                          );
                        },
                      },
                    });
                  }}
                >
                  <KeyRound className="mr-2 size-4" />
                  Sign in with Passkey
                </Button>
                {autoPasskeyFailed ? (
                  <p className="text-xs text-muted-foreground">
                    Passkey was not completed. Use one of the fallback methods below.
                  </p>
                ) : null}
              </>
            ) : null}

            {signInFormMethods.length > 0 ? (
              <SignInForm
                params={params}
                callbackURL={callbackUrl}
                onSuccess={() => router.push(callbackUrl)}
                magicLinkNewUserCallbackURL={buildMagicLinkNewUserCallbackURL(callbackUrl)}
                magicLinkErrorCallbackURL={buildMagicLinkErrorCallbackURL(callbackUrl)}
                allowedMethods={signInFormMethods}
                allowedIdentifierTabs={
                  identifierType
                    ? [identifierType]
                    : profile.identify.identifiers
                }
                fixedIdentifier={fixedIdentifier}
                hideIdentifierTabs={Boolean(identifierType)}
              />
            ) : null}

            {socialVisible ? (
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
                <SocialSignInButtons callbackURL={callbackUrl} params={params} />
              </>
            ) : null}

            <Button type="button" variant="ghost" onClick={() => router.push(identifyHref)}>
              Use a different identifier
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
