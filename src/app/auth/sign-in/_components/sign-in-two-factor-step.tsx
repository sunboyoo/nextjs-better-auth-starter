"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ClientAuthenticationProfile } from "@/config/authentication/client";
import { TwoFactorEmailOtpForm } from "@/components/forms/two-factor-email-otp-form";
import { TwoFactorTotpForm } from "@/components/forms/two-factor-totp-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSignInFlowContext } from "@/lib/authentication-profile-flow";

interface SignInTwoFactorStepProps {
  profile: ClientAuthenticationProfile;
}

export function SignInTwoFactorStep({ profile }: SignInTwoFactorStepProps) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = getSignInFlowContext(params).callbackUrl;

  const supportsTotp = profile.mfa.factors.includes("totp");
  const supportsEmailOtp = profile.mfa.factors.includes("emailOtp");
  const unsupportedFactors = profile.mfa.factors.filter(
    (factor) => factor !== "totp" && factor !== "emailOtp",
  );
  const availableTabs = [
    supportsTotp ? "totp" : null,
    supportsEmailOtp ? "emailOtp" : null,
  ].filter(Boolean) as Array<"totp" | "emailOtp">;
  const factorParam = params.get("factor");
  const initialTab =
    factorParam === "emailOtp" && supportsEmailOtp
      ? "emailOtp"
      : factorParam === "totp" && supportsTotp
        ? "totp"
        : availableTabs[0] ?? "totp";
  const [activeTab, setActiveTab] = useState<"totp" | "emailOtp">(initialTab);

  const onSuccess = () => {
    router.push(callbackUrl);
  };

  const mfaDisabled = profile.mfa.policy === "disabled";

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Verify your sign-in with a second factor allowed by the active authentication profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaDisabled ? (
            <>
              <p className="text-sm text-muted-foreground">
                MFA is disabled for this profile.
              </p>
              <Button onClick={onSuccess} className="w-full">
                Continue
              </Button>
            </>
          ) : null}

          {!mfaDisabled && availableTabs.length > 0 ? (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "totp" | "emailOtp") }>
              {availableTabs.length > 1 ? (
                <TabsList className="grid w-full grid-cols-2">
                  {supportsTotp ? <TabsTrigger value="totp">Authenticator App</TabsTrigger> : null}
                  {supportsEmailOtp ? <TabsTrigger value="emailOtp">Email OTP</TabsTrigger> : null}
                </TabsList>
              ) : null}

              {supportsTotp ? (
                <TabsContent value="totp" className="mt-4">
                  <TwoFactorTotpForm onSuccess={onSuccess} />
                </TabsContent>
              ) : null}

              {supportsEmailOtp ? (
                <TabsContent value="emailOtp" className="mt-4">
                  <TwoFactorEmailOtpForm onSuccess={onSuccess} />
                </TabsContent>
              ) : null}
            </Tabs>
          ) : null}

          {!mfaDisabled && availableTabs.length === 0 ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              No supported MFA factor UI is configured for this profile. Allowed factors: {profile.mfa.factors.join(", ")}.
            </div>
          ) : null}

          {unsupportedFactors.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Additional factors configured but not yet surfaced in this UI: {unsupportedFactors.join(", ")}.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
