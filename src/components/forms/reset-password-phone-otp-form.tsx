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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";

const phoneNumberRegex = /^\+[1-9]\d{7,14}$/;
const normalizePhoneNumber = (value: string) => value.replace(/[()\s-]/g, "");

const resetPasswordPhoneOtpSchema = z
  .object({
    phoneNumber: z
      .string()
      .trim()
      .min(1, "Phone number is required.")
      .refine(
        (value) => phoneNumberRegex.test(normalizePhoneNumber(value)),
        "Enter a valid phone number in international format, e.g. +14155551234.",
      ),
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

type ResetPasswordPhoneOtpFormValues = z.infer<
  typeof resetPasswordPhoneOtpSchema
>;
type CaptchaAction = "send-reset-phone-otp";

interface ResetPasswordPhoneOtpFormProps {
  initialPhoneNumber?: string;
  onSuccess?: () => void;
}

export function ResetPasswordPhoneOtpForm({
  initialPhoneNumber = "",
  onSuccess,
}: ResetPasswordPhoneOtpFormProps) {
  const [loading, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"send" | "reset" | null>(
    null,
  );
  const [otpSent, setOtpSent] = useState(false);
  const {
    captchaRef,
    runCaptchaForActionOrFail,
    resetCaptcha,
    isCaptchaVisibleFor,
  } = useCaptchaAction<CaptchaAction>();

  const form = useForm<ResetPasswordPhoneOtpFormValues>({
    resolver: zodResolver(resetPasswordPhoneOtpSchema),
    defaultValues: {
      phoneNumber: initialPhoneNumber,
      otp: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSendOtp = () => {
    setPendingAction("send");
    startTransition(async () => {
      try {
        const isPhoneValid = await form.trigger("phoneNumber");
        if (!isPhoneValid) return;
        const captchaToken = await runCaptchaForActionOrFail(
          "send-reset-phone-otp",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        const phoneNumber = normalizePhoneNumber(
          form.getValues("phoneNumber").trim(),
        );
        const result = await authClient.phoneNumber.requestPasswordReset(
          {
            phoneNumber,
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
          "If an account exists for this phone number, a password reset OTP has been sent.",
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
          "phoneNumber",
          "otp",
          "password",
          "confirmPassword",
        ]);
        if (!isValid) return;

        const values = form.getValues();
        const result = await authClient.phoneNumber.resetPassword({
          otp: values.otp.trim(),
          phoneNumber: normalizePhoneNumber(values.phoneNumber.trim()),
          newPassword: values.password,
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
    <div className="grid gap-4">
      <FieldGroup>
        <Controller
          name="phoneNumber"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password-reset-phone-otp-phone">
                Phone Number
              </FieldLabel>
              <Input
                {...field}
                id="password-reset-phone-otp-phone"
                type="tel"
                placeholder="+14155551234"
                aria-invalid={fieldState.invalid}
                autoComplete="tel"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button
        type="button"
        variant="outline"
        onClick={onSendOtp}
        disabled={loading}
      >
        {loading && pendingAction === "send" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : otpSent ? (
          "Resend password reset OTP"
        ) : (
          "Send password reset OTP"
        )}
      </Button>
      <CaptchaActionSlot
        show={isCaptchaVisibleFor("send-reset-phone-otp")}
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
                  <FieldLabel htmlFor="password-reset-phone-otp-code">
                    Password reset OTP
                  </FieldLabel>
                  <Input
                    {...field}
                    id="password-reset-phone-otp-code"
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password-reset-phone-otp-password">
                    New password
                  </FieldLabel>
                  <PasswordInput
                    {...field}
                    id="password-reset-phone-otp-password"
                    placeholder="Enter new password"
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password-reset-phone-otp-confirm">
                    Confirm password
                  </FieldLabel>
                  <PasswordInput
                    {...field}
                    id="password-reset-phone-otp-confirm"
                    placeholder="Confirm new password"
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <Button type="button" onClick={onResetPassword} disabled={loading}>
            {loading && pendingAction === "reset" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Reset password with phone OTP"
            )}
          </Button>
        </>
      )}
    </div>
  );
}
