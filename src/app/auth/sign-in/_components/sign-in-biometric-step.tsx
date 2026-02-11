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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Use the button below to start passkey authentication.",
  );

  useEffect(() => {
    if (!shouldUseDedicatedBiometricPage(profile)) {
      router.replace(methodFallbackHref);
    }
  }, [methodFallbackHref, profile, router]);

  const resolvePasskeyErrorMessage = (error: unknown): string => {
    if (error && typeof error === "object") {
      const name =
        "name" in error && typeof error.name === "string"
          ? error.name
          : undefined;
      const message =
        "message" in error && typeof error.message === "string"
          ? error.message
          : undefined;

      if (
        name === "NotAllowedError" ||
        message?.includes("timed out or was not allowed")
      ) {
        return "Passkey sign-in was canceled or timed out. Try again or use another sign-in method.";
      }

      if (message) {
        return message;
      }
    }

    return "Passkey was canceled or failed. Continuing with fallback methods.";
  };

  const handlePasskeyFailure = (message: string) => {
    if (profile.biometric?.fallback.toMethodPage) {
      toast.message(message);
      router.replace(methodFallbackHref);
      return;
    }

    setStatusMessage(message);
  };

  const handlePasskeySignIn = async () => {
    if (isAuthenticating) {
      return;
    }

    setIsAuthenticating(true);
    setStatusMessage("Waiting for passkey confirmation...");

    try {
      await authClient.signIn.passkey({
        fetchOptions: {
          query: requestQuery,
          onSuccess() {
            toast.success("Successfully signed in");
            router.push(callbackUrl);
          },
          onError(context) {
            handlePasskeyFailure(resolvePasskeyErrorMessage(context.error));
          },
        },
      });
    } catch (error) {
      handlePasskeyFailure(resolvePasskeyErrorMessage(error));
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Biometric sign-in</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Complete passkey authentication using your device biometrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="rounded-md border p-4 text-sm text-muted-foreground flex items-center gap-2">
              {isAuthenticating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              <span>{statusMessage}</span>
            </div>

            <Button
              type="button"
              onClick={handlePasskeySignIn}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? "Waiting for passkey..." : "Sign in with Passkey"}
            </Button>

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
    </main>
  );
}
