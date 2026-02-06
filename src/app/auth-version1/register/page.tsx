"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RegisterForm from "@/components/auth/register-form";
import { GoogleIcon, GithubIcon } from "@/components/ui/icons";
import { signInWithGithub, signInWithGoogle } from "@/lib/auth-client";
import { GalleryVerticalEnd } from "lucide-react";
import { getSafeCallbackUrl } from "@/lib/auth-callback";

const RegisterActions = () => {
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
          className="w-1/2 flex items-center justify-center"
          type="button"
          onClick={() => signInWithGoogle(callbackUrl)}
        >
          <GoogleIcon className="mr-2" />
          Google
        </Button>
        <Button
          variant="outline"
          className="w-1/2 flex items-center justify-center"
          type="button"
          onClick={() => signInWithGithub(callbackUrl)}
        >
          <GithubIcon className="mr-2" />
          GitHub
        </Button>
      </div>
      <div className="text-center text-sm mt-4">
        Already have an account?{" "}
        <Link
          href={`/auth/login${callbackQuery}`}
          className="text-primary underline hover:no-underline font-medium"
        >
          Login
        </Link>
      </div>
    </>
  );
};

const RegisterPage = () => {
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
            <RegisterForm />
            <Suspense fallback={null}>
              <RegisterActions />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
