"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";

const resetPasswordEmailOtpSchema = z
  .object({
    email: z.email("Please enter a valid email address."),
    otp: z
      .string()
      .min(4, "OTP is required.")
      .regex(/^\d+$/, "OTP must contain only digits."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordEmailOtpFormValues = z.infer<typeof resetPasswordEmailOtpSchema>;

interface ResetPasswordEmailOtpFormProps {
  initialEmail?: string;
  onSuccess?: () => void;
}

export function ResetPasswordEmailOtpForm({
  initialEmail = "",
  onSuccess,
}: ResetPasswordEmailOtpFormProps) {
  const [loading, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"send" | "reset" | null>(
    null,
  );
  const [otpSent, setOtpSent] = useState(false);

  const form = useForm<ResetPasswordEmailOtpFormValues>({
    resolver: zodResolver(resetPasswordEmailOtpSchema),
    defaultValues: {
      email: initialEmail,
      otp: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSendOtp = () => {
    setPendingAction("send");
    startTransition(async () => {
      try {
        const isEmailValid = await form.trigger("email");
        if (!isEmailValid) return;

        const email = form.getValues("email").trim().toLowerCase();
        const result = await authClient.emailOtp.requestPasswordReset({
          email,
        });

        if (result.error) {
          toast.error(result.error.message || "Failed to send password reset OTP.");
          return;
        }

        setOtpSent(true);
        form.setValue("otp", "");
        toast.success("Password reset OTP sent. Check your inbox and spam folder.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const onResetPassword = () => {
    setPendingAction("reset");
    startTransition(async () => {
      try {
        const isValid = await form.trigger([
          "email",
          "otp",
          "password",
          "confirmPassword",
        ]);
        if (!isValid) return;

        const values = form.getValues();
        const result = await authClient.emailOtp.resetPassword({
          email: values.email.trim().toLowerCase(),
          otp: values.otp.trim(),
          password: values.password,
        });

        if (result.error) {
          toast.error(result.error.message || "Failed to reset password with OTP.");
          return;
        }

        toast.success("Password reset successfully.");
        onSuccess?.();
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
              <FieldLabel htmlFor="password-reset-email-otp-email">Email</FieldLabel>
              <Input
                {...field}
                id="password-reset-email-otp-email"
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
          "Resend password reset OTP"
        ) : (
          "Send password reset OTP"
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
                  <FieldLabel htmlFor="password-reset-email-otp-code">
                    Password reset OTP
                  </FieldLabel>
                  <Input
                    {...field}
                    id="password-reset-email-otp-code"
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
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password-reset-email-otp-password">
                    New password
                  </FieldLabel>
                  <PasswordInput
                    {...field}
                    id="password-reset-email-otp-password"
                    placeholder="Enter new password"
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password-reset-email-otp-confirm">
                    Confirm password
                  </FieldLabel>
                  <PasswordInput
                    {...field}
                    id="password-reset-email-otp-confirm"
                    placeholder="Confirm new password"
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <Button type="button" onClick={onResetPassword} disabled={loading}>
            {loading && pendingAction === "reset" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Reset password with OTP"
            )}
          </Button>
        </>
      )}
    </div>
  );
}

