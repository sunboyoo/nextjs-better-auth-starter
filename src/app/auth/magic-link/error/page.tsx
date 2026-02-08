"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSignInUrl, getMagicLinkSafeCallbackUrl } from "@/lib/magic-link";

const DEFAULT_ERROR_MESSAGE = "The magic link is invalid or expired.";

export default function MagicLinkErrorPage() {
  const searchParams = useSearchParams();
  const callbackUrl = getMagicLinkSafeCallbackUrl(searchParams.get("callbackUrl"));
  const errorCode = searchParams.get("error");
  const errorDescription =
    searchParams.get("error_description") ?? DEFAULT_ERROR_MESSAGE;

  return (
    <main className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Magic link failed</CardTitle>
          <CardDescription>We could not complete sign in with this link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>{errorCode || "Verification failed"}</AlertTitle>
            <AlertDescription>{errorDescription}</AlertDescription>
          </Alert>
          <div className="grid gap-2">
            <Button asChild>
              <Link href={buildSignInUrl(callbackUrl)}>Request a new magic link</Link>
            </Button>
            <Button asChild variant="link" className="gap-2">
              <Link href={callbackUrl}>
                <ArrowLeft size={15} />
                Return to app
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

