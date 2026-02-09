"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot";
import { useCaptchaAction } from "@/components/captcha/use-captcha-action";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";

const resetPasswordEmailOtpSchema = z
  .object({
    email: z.email("Please enter a valid email address."),
    otp: z
      .string()
      .min(4, "OTP is required.")
      .regex(/^\d+$/, "OTP must contain only digits."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm my password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordEmailOtpFormValues = z.infer<typeof resetPasswordEmailOtpSchema>;
type CaptchaAction = "send-reset-otp" | "send-reset-link";

interface ResetPasswordEmailOtpFormProps {
  initialEmail?: string;
  onSuccess?: () => void;
  onLinkSuccess?: () => void;
  sendCodeLabel?: string;
  resendCodeLabel?: string;
  linkLabel?: string;
}

export function ResetPasswordEmailOtpForm({
  initialEmail = "",
  onSuccess,
  onLinkSuccess,
  sendCodeLabel = "Send password reset OTP",
  resendCodeLabel = "Resend password reset OTP",
  linkLabel = "Email me a link",
}: ResetPasswordEmailOtpFormProps) {
  const [loading, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<
    "send" | "reset" | "link" | null
  >(
    null,
  );
  const [otpSent, setOtpSent] = useState(false);
  const {
    captchaRef,
    runCaptchaForActionOrFail,
    resetCaptcha,
    isCaptchaVisibleFor,
  } = useCaptchaAction<CaptchaAction>();

  const form = useForm<ResetPasswordEmailOtpFormValues>({
    resolver: zodResolver(resetPasswordEmailOtpSchema),
    defaultValues: {
      email: initialEmail,
      otp: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSendLink = () => {
    setPendingAction("link");
    startTransition(async () => {
      try {
        const isEmailValid = await form.trigger("email");
        if (!isEmailValid) return;
        const captchaToken = await runCaptchaForActionOrFail(
          "send-reset-link",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        const email = form.getValues("email").trim().toLowerCase();
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: "/auth/reset-password",
          fetchOptions: {
            headers: getCaptchaHeaders(captchaToken),
          },
        });

        if (result.error && result.error.status === 429) {
          toast.error("Too many requests. Please try again later.");
          return;
        }

        onLinkSuccess?.();
      } finally {
        resetCaptcha();
        setPendingAction(null);
      }
    });
  };

  const onSendOtp = () => {
    setPendingAction("send");
    startTransition(async () => {
      try {
        const isEmailValid = await form.trigger("email");
        if (!isEmailValid) return;
        const captchaToken = await runCaptchaForActionOrFail("send-reset-otp", () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        });
        if (captchaToken === undefined) return;

        const email = form.getValues("email").trim().toLowerCase();
        const result = await authClient.emailOtp.requestPasswordReset(
          {
            email,
          },
          {
            headers: getCaptchaHeaders(captchaToken),
          },
        );

        if (result.error) {
          if (result.error.status === 429) {
            toast.error("Too many requests. Please try again later.");
            return;
          }
        }

        setOtpSent(true);
        form.setValue("otp", "");
        toast.success(
          "If an account exists for this email, a password reset OTP has been sent.",
        );
      } finally {
        resetCaptcha();
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
          if (result.error.status === 429) {
            toast.error("Too many requests. Please try again later.");
            return;
          }
          toast.error("Unable to reset password. Check the OTP and try again.");
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
    <div className="grid gap-6">
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
                placeholder="Enter my email"
                aria-invalid={fieldState.invalid}
                autoComplete="email"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={onSendLink}
          disabled={loading}
        >
          {loading && pendingAction === "link" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            linkLabel
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSendOtp}
          disabled={loading}
        >
          {loading && pendingAction === "send" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : otpSent ? (
            resendCodeLabel
          ) : (
            sendCodeLabel
          )}
        </Button>
      </div>
      <CaptchaActionSlot
        show={
          isCaptchaVisibleFor("send-reset-link") ||
          isCaptchaVisibleFor("send-reset-otp")
        }
        captchaRef={captchaRef}
      />

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
