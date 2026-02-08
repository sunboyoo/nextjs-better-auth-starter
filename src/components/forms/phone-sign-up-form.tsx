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
import { authClient } from "@/lib/auth-client";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";

const phoneNumberRegex = /^\+[1-9]\d{7,14}$/;

const normalizePhoneNumber = (value: string) => value.replace(/[()\s-]/g, "");

const phoneSignUpSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .refine(
      (value) => phoneNumberRegex.test(normalizePhoneNumber(value)),
      "Enter a valid phone number in international format, e.g. +14155551234.",
    ),
  otp: z.string().trim(),
});

type PhoneSignUpFormValues = z.infer<typeof phoneSignUpSchema>;
type CaptchaAction = "phone-sign-up-send-otp" | "phone-sign-up-verify-otp";

interface PhoneSignUpFormProps {
  onSuccess?: () => void;
  params?: URLSearchParams;
}

export function PhoneSignUpForm({ onSuccess, params }: PhoneSignUpFormProps) {
  const [loading, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"send" | "verify" | null>(
    null,
  );
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const {
    captchaRef,
    runCaptchaForActionOrFail,
    resetCaptcha,
    isCaptchaVisibleFor,
  } = useCaptchaAction<CaptchaAction>();

  const form = useForm<PhoneSignUpFormValues>({
    resolver: zodResolver(phoneSignUpSchema),
    defaultValues: {
      phoneNumber: "",
      otp: "",
    },
  });

  const requestQuery = params
    ? Object.fromEntries(params.entries())
    : undefined;

  const onSendOtp = () => {
    setPendingAction("send");
    startTransition(async () => {
      try {
        const isPhoneValid = await form.trigger("phoneNumber");
        if (!isPhoneValid) return;

        const captchaToken = await runCaptchaForActionOrFail(
          "phone-sign-up-send-otp",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        const phoneNumber = normalizePhoneNumber(
          form.getValues("phoneNumber").trim(),
        );

        const { error } = await authClient.phoneNumber.sendOtp(
          {
            phoneNumber,
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
          },
        );

        if (error) {
          throw new Error(error.message);
        }

        setOtpSentTo(phoneNumber);
        form.setValue("otp", "");
        toast.success("OTP sent to your phone.");
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to send OTP");
      } finally {
        resetCaptcha();
        setPendingAction(null);
      }
    });
  };

  const onVerifyOtp = () => {
    setPendingAction("verify");
    startTransition(async () => {
      try {
        if (!otpSentTo) {
          toast.error("Send OTP first.");
          return;
        }

        const otp = form.getValues("otp").trim();
        if (!otp || !/^\d+$/.test(otp)) {
          form.setError("otp", {
            message: "Enter a valid OTP code.",
          });
          return;
        }

        const captchaToken = await runCaptchaForActionOrFail(
          "phone-sign-up-verify-otp",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        const { error } = await authClient.phoneNumber.verify(
          {
            phoneNumber: otpSentTo,
            code: otp,
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
          },
        );

        if (error) {
          throw new Error(error.message);
        }

        toast.success("Phone verified. You're signed in.");
        onSuccess?.();
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : "Failed to verify OTP",
        );
      } finally {
        resetCaptcha();
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        Sign up with your phone number. We&apos;ll create your account after OTP
        verification and you can add a real email later.
      </p>

      <FieldGroup>
        <Controller
          name="phoneNumber"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="phone-sign-up-number">Phone Number</FieldLabel>
              <Input
                {...field}
                id="phone-sign-up-number"
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
        className="w-full"
        disabled={loading}
        onClick={onSendOtp}
      >
        {loading && pendingAction === "send" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : otpSentTo ? (
          "Resend OTP"
        ) : (
          "Send OTP"
        )}
      </Button>
      <CaptchaActionSlot
        show={isCaptchaVisibleFor("phone-sign-up-send-otp")}
        captchaRef={captchaRef}
      />

      {otpSentTo && (
        <>
          <FieldGroup>
            <Controller
              name="otp"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="phone-sign-up-otp">OTP Code</FieldLabel>
                  <Input
                    {...field}
                    id="phone-sign-up-otp"
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
          </FieldGroup>

          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={onVerifyOtp}
          >
            {loading && pendingAction === "verify" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Verify OTP and Continue"
            )}
          </Button>
          <CaptchaActionSlot
            show={isCaptchaVisibleFor("phone-sign-up-verify-otp")}
            captchaRef={captchaRef}
          />
        </>
      )}
    </div>
  );
}
