"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ClientAuthenticationProfile } from "@/config/authentication/client";
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
  shouldUseDedicatedBiometricPage,
} from "@/lib/authentication-profile-flow";
import { authClient } from "@/lib/auth-client";

interface SignInBiometricStepProps {
  profile: ClientAuthenticationProfile;
}

export function SignInBiometricStep({ profile }: SignInBiometricStepProps) {
  const router = useRouter();
  const params = useSearchParams();
  const queryString = params.toString();
  const requestQuery = useMemo(
    () => Object.fromEntries(new URLSearchParams(queryString).entries()),
    [queryString],
  );
  const flowContext = useMemo(() => getSignInFlowContext(params), [params]);
  const { callbackUrl } = flowContext;
  const methodFallbackHref = buildAuthPageUrl(profile.pages.method, flowContext);
  const [statusMessage, setStatusMessage] = useState(
    "Trying passkey authentication...",
  );

  useEffect(() => {
    if (!shouldUseDedicatedBiometricPage(profile)) {
      router.replace(methodFallbackHref);
      return;
    }

    const attemptStorageKey = `auth-profile:biometric-passkey:${profile.id}:${queryString}`;

    if (typeof window !== "undefined") {
      if (window.sessionStorage.getItem(attemptStorageKey)) {
        return;
      }
      window.sessionStorage.setItem(attemptStorageKey, "1");
    }

    void authClient.signIn.passkey({
      fetchOptions: {
        query: requestQuery,
        onSuccess() {
          toast.success("Successfully signed in");
          router.push(callbackUrl);
        },
        onError(context) {
          const message =
            context.error?.message ||
            "Passkey was canceled or failed. Continuing with fallback methods.";

          if (profile.biometric?.fallback.toMethodPage) {
            toast.message(message);
            router.replace(methodFallbackHref);
            return;
          }

          setStatusMessage(message);
        },
      },
    });
  }, [callbackUrl, methodFallbackHref, profile, queryString, requestQuery, router]);

  return (
    <Card className="w-full rounded-none max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Biometric sign-in</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Complete passkey authentication using your device biometrics.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="rounded-md border p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>{statusMessage}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.replace(methodFallbackHref)}
          >
            Use another sign-in method
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
