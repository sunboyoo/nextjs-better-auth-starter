"use client";

import { ArrowRight, UserPlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSignInUrl, getMagicLinkSafeCallbackUrl } from "@/lib/magic-link";

export default function MagicLinkNewUserPage() {
  const searchParams = useSearchParams();
  const callbackUrl = getMagicLinkSafeCallbackUrl(searchParams.get("callbackUrl"));

  return (
    <main className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Your account has been created successfully.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            You are signed in and can continue to your destination.
          </p>
          <div className="grid gap-2">
            <Button asChild>
              <Link href={callbackUrl}>
                Continue
                <ArrowRight size={15} />
              </Link>
            </Button>
            <Button asChild variant="link">
              <Link href={buildSignInUrl(callbackUrl)}>Back to sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

