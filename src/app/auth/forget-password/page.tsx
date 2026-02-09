"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ResetPasswordEmailOtpForm } from "@/components/forms/reset-password-email-otp-form";
import { ResetPasswordPhoneOtpForm } from "@/components/forms/reset-password-phone-otp-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Page() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Request received</CardTitle>
            <CardDescription>
              If your account exists and supports this channel, reset instructions were sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="default">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Check your email or phone messages and spam folder.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/auth/sign-in">
              <Button variant="link" className="px-0 gap-2">
                <ArrowLeft size={15} />
                Back to sign in
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>
            Choose email or phone to reset my password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="mt-4">
              <ResetPasswordEmailOtpForm
                onLinkSuccess={() => setIsSubmitted(true)}
                onSuccess={() => router.push("/auth/sign-in")}
                linkLabel="Email me a link"
                sendCodeLabel="Email me a code"
                resendCodeLabel="Resend email code"
              />
            </TabsContent>
            <TabsContent value="phone" className="mt-4">
              <ResetPasswordPhoneOtpForm
                onSuccess={() => router.push("/auth/sign-in")}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/auth/sign-in">
            <Button variant="link" className="px-0 gap-2">
              <ArrowLeft size={15} />
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
