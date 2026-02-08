"use client";

import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSignInUrl, getMagicLinkSafeCallbackUrl } from "@/lib/magic-link";

function maskEmail(email: string): string {
  const [localPart, domainPart] = email.split("@");

  if (!localPart || !domainPart) {
    return "";
  }

  const visibleChars = Math.min(2, localPart.length);
  const maskedChars = "*".repeat(Math.max(1, localPart.length - visibleChars));
  return `${localPart.slice(0, visibleChars)}${maskedChars}@${domainPart}`;
}

export default function MagicLinkSentPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const callbackUrl = getMagicLinkSafeCallbackUrl(searchParams.get("callbackUrl"));
  const maskedEmail = maskEmail(email);

  return (
    <main className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <MailCheck className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link
            {maskedEmail ? ` to ${maskedEmail}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Open the email and click the link to sign in. The link expires soon
            for security reasons.
          </p>
          <div className="grid gap-2">
            <Button asChild>
              <Link href={callbackUrl}>Return to app</Link>
            </Button>
            <Button asChild variant="link" className="gap-2">
              <Link href={buildSignInUrl(callbackUrl)}>
                <ArrowLeft size={15} />
                Back to sign in
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

