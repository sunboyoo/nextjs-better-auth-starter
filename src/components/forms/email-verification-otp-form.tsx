"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const emailVerificationOtpSchema = z.object({
  email: z.email("Please enter a valid email address."),
  otp: z
    .string()
    .min(4, "OTP is required.")
    .regex(/^\d+$/, "OTP must contain only digits."),
});

type EmailVerificationOtpFormValues = z.infer<typeof emailVerificationOtpSchema>;

interface EmailVerificationOtpFormProps {
  callbackURL: string;
  initialEmail?: string;
}

function buildSignInHref(callbackURL: string): string {
  const query = new URLSearchParams({
    callbackUrl: callbackURL,
  });

  return `/auth/sign-in?${query.toString()}`;
}

export function EmailVerificationOtpForm({
  callbackURL,
  initialEmail = "",
}: EmailVerificationOtpFormProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"send" | "verify" | null>(
    null,
  );
  const [otpSent, setOtpSent] = useState(false);

  const form = useForm<EmailVerificationOtpFormValues>({
    resolver: zodResolver(emailVerificationOtpSchema),
    defaultValues: {
      email: initialEmail,
      otp: "",
    },
  });

  const onSendOtp = () => {
    setPendingAction("send");
    startTransition(async () => {
      try {
        const isEmailValid = await form.trigger("email");
        if (!isEmailValid) return;

        const email = form.getValues("email").trim().toLowerCase();
        const result = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "email-verification",
        });

        if (result.error) {
          toast.error(result.error.message || "Failed to send verification OTP.");
          return;
        }

        setOtpSent(true);
        form.setValue("otp", "");
        toast.success("Verification OTP sent. Check your inbox and spam folder.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const onVerifyOtp = () => {
    setPendingAction("verify");
    startTransition(async () => {
      try {
        const isValid = await form.trigger(["email", "otp"]);
        if (!isValid) return;

        const values = form.getValues();
        const email = values.email.trim().toLowerCase();
        const otp = values.otp.trim();

        const result = await authClient.emailOtp.verifyEmail({
          email,
          otp,
        });

        if (result.error) {
          toast.error(result.error.message || "Failed to verify email OTP.");
          return;
        }

        toast.success("Email verified successfully.");
        if (result.data?.token) {
          router.push(callbackURL);
          return;
        }

        router.push(buildSignInHref(callbackURL));
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="grid gap-4">
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email-verification-otp-email">Email</FieldLabel>
              <Input
                {...field}
                id="email-verification-otp-email"
                type="email"
                placeholder="Enter your email"
                aria-invalid={fieldState.invalid}
                autoComplete="email"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="button" variant="outline" onClick={onSendOtp} disabled={loading}>
        {loading && pendingAction === "send" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : otpSent ? (
          "Resend verification OTP"
        ) : (
          "Send verification OTP"
        )}
      </Button>

      {otpSent && (
        <>
          <FieldGroup>
            <Controller
              name="otp"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email-verification-otp-code">
                    Verification OTP
                  </FieldLabel>
                  <Input
                    {...field}
                    id="email-verification-otp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter OTP code"
                    aria-invalid={fieldState.invalid}
                    maxLength={10}
                    onChange={(event) =>
                      field.onChange(event.target.value.replace(/[^\d]/g, ""))
                    }
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <Button type="button" onClick={onVerifyOtp} disabled={loading}>
            {loading && pendingAction === "verify" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Verify email OTP"
            )}
          </Button>
        </>
      )}
    </div>
  );
}

