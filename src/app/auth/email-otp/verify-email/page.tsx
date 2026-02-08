"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmailVerificationOtpForm } from "@/components/forms/email-verification-otp-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getSafeCallbackUrl } from "@/lib/auth-callback";

function buildSignInHref(callbackURL: string): string {
  const query = new URLSearchParams({
    callbackUrl: callbackURL,
  });

  return `/auth/sign-in?${query.toString()}`;
}

export default function VerifyEmailOtpPage() {
  const searchParams = useSearchParams();
  const callbackURL = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const initialEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";

  return (
    <main className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify email with OTP</CardTitle>
          <CardDescription>
            Request a verification code and enter it to verify your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailVerificationOtpForm
            callbackURL={callbackURL}
            initialEmail={initialEmail}
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="link" className="px-0 gap-2">
            <Link href={buildSignInHref(callbackURL)}>
              <ArrowLeft size={15} />
              Back to sign in
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

