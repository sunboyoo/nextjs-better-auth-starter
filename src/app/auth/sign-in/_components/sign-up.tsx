"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PhoneSignUpForm } from "@/components/forms/phone-sign-up-form";
import { SignUpForm } from "@/components/forms/sign-up-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCallbackURL } from "@/lib/better-auth-official/shared";

export function SignUp() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackURL = getCallbackURL(params);

  return (
    <Card className="rounded-md rounded-t-none w-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign Up</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Create an account with email or phone OTP
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone OTP</TabsTrigger>
          </TabsList>
          <TabsContent value="email" className="mt-4">
            <SignUpForm
              params={params}
              onSuccess={() =>
                router.push(
                  `/auth/sign-in?callbackUrl=${encodeURIComponent(callbackURL)}`,
                )
              }
              callbackURL={callbackURL}
            />
          </TabsContent>
          <TabsContent value="phone" className="mt-4">
            <PhoneSignUpForm
              params={params}
              onSuccess={() => router.push(callbackURL)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
