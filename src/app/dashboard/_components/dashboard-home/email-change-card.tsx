"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { changeEmailSchema, ChangeEmailSchema } from "@/lib/schemas";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormError, FormSuccess } from "@/components/ui/form-messages";

const EmailChangeCard = () => {
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();
  const [isOpen, setIsOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<{
    success?: string;
    error?: string;
  }>({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailSchema>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ChangeEmailSchema) => {
    setFormState({});

    if (!session?.user?.email) {
      setFormState({ error: "You need to be signed in to change your email." });
      return;
    }

    const normalizedEmail = values.email.trim().toLowerCase();
    const currentEmail = session.user.email.trim().toLowerCase();

    if (normalizedEmail === currentEmail) {
      setFormState({
        error: "New email must be different from your current email.",
      });
      return;
    }

    const result = await authClient.changeEmail({
      newEmail: normalizedEmail,
      callbackURL: "/dashboard",
    });

    if (result?.error) {
      setFormState({
        error: result.error.message || "Failed to request email change.",
      });
      return;
    }

    const verified = session.user.emailVerified === true;
    setFormState({
      success: verified
        ? "Check your current inbox to confirm the change. After confirmation, verify the new email."
        : "Check your new inbox to verify the change. Your email updates after verification.",
    });
    reset();
  };

  const isVerified = session?.user?.emailVerified === true;

  return (
    <div className="mb-12 flex flex-col gap-4">
      <Card>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="change-email-panel"
          className="flex w-full items-center gap-4 px-6 text-left transition hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Image
              src="/logo.png"
              alt="Logo"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </span>
          <span className="flex flex-1 flex-col gap-1">
            <span className="text-base font-semibold">Change Email</span>
            <span className="text-sm text-muted-foreground">
              Update the email address on your account.
            </span>
          </span>
          {session ? (
            <Badge variant={isVerified ? "secondary" : "outline"}>
              {isVerified ? "Verified" : "Unverified"}
            </Badge>
          ) : null}
        </button>
      </Card>

      {isOpen ? (
        <Card id="change-email-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Change Email
            </CardTitle>
            <CardDescription>
              Update the email address on your account.
            </CardDescription>
            <CardAction>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <p className="text-sm text-muted-foreground">
                Loading account...
              </p>
            ) : session ? (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex w-full flex-col gap-4"
              >
                <FormSuccess message={formState.success || ""} />
                <FormError message={formState.error || ""} />

                <div className="grid gap-2">
                  <Label htmlFor="current-email">Current email</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      id="current-email"
                      value={session.user.email || ""}
                      readOnly
                    />
                    <Badge variant={isVerified ? "secondary" : "outline"}>
                      {isVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-email">New email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="you@new-domain.com"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <span className="text-xs text-red-500">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {isVerified
                    ? "We will email your current address to confirm this change, then send a verification link to the new email."
                    : "We will send a verification link to the new email before updating your account."}
                </p>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Requesting..." : "Request email change"}
                </Button>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Sign in to update the email address on your account.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link href="/auth/sign-in">Sign In</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/auth/sign-in">Create Account</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default EmailChangeCard;
