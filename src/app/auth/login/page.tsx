"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import LoginForm from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleIcon, GithubIcon } from "@/components/ui/icons";
import { signInWithGithub, signInWithGoogle } from "@/lib/auth-client";
import { GalleryVerticalEnd, Loader2 } from "lucide-react";
import { getSafeCallbackUrl } from "@/lib/auth-callback";

const LoginFormFallback = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const LoginActions = () => {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = getSafeCallbackUrl(rawCallbackUrl);
  const callbackQuery = rawCallbackUrl
    ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "";

  return (
    <>
      <div className="flex items-center my-2">
        <div className="flex-1 h-px bg-muted-foreground/30" />
        <span className="mx-3 text-muted-foreground text-xs font-medium">
          OR
        </span>
        <div className="flex-1 h-px bg-muted-foreground/30" />
      </div>
      <div className="flex flex-row gap-2 w-full">
        <Button
          variant="outline"
          className="w-1/2 flex items-center justify-center cursor-pointer"
          type="button"
          onClick={() => signInWithGoogle(callbackUrl)}
        >
          <GoogleIcon className="mr-2" />
          Google
        </Button>
        <Button
          variant="outline"
          className="w-1/2 flex items-center justify-center cursor-pointer"
          type="button"
          onClick={() => signInWithGithub(callbackUrl)}
        >
          <GithubIcon className="mr-2" />
          GitHub
        </Button>
      </div>
      <div className="text-center text-sm mt-4">
        Not registered?{" "}
        <Link
          href={`/auth/register${callbackQuery}`}
          className="text-primary underline hover:no-underline font-medium"
        >
          Create an account
        </Link>
      </div>
    </>
  );
};

const LoginPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="flex flex-col items-center w-full max-w-md gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Better Auth Starter
        </a>
        <Card className="w-full">
          <CardContent className="flex flex-col gap-4 pt-6">
            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>
            <Suspense fallback={<LoginFormFallback />}>
              <LoginActions />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
