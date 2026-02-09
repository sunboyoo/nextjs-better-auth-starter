"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot";
import { useCaptchaAction } from "@/components/captcha/use-captcha-action";
import {
  defaultPhoneCountry,
  getE164PhoneNumber,
  getPhoneCountryByIso2,
  normalizePhoneLocalNumber,
  PhoneNumberWithCountryInput,
} from "@/components/forms/phone-number-with-country-input";
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
import { PHONE_COUNTRIES } from "@/lib/phone-countries";

const phoneNumberRegex = /^\+[1-9]\d{7,14}$/;
const PHONE_COUNTRIES_BY_DIAL_CODE = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length,
);

const getInitialPhoneFormValues = (initialPhoneNumber: string) => {
  const normalizedInitialPhone = initialPhoneNumber.trim();
  if (!normalizedInitialPhone) {
    return {
      countryIso2: defaultPhoneCountry?.iso2 ?? "",
      phoneNumber: "",
    };
  }

  if (!normalizedInitialPhone.startsWith("+")) {
    return {
      countryIso2: defaultPhoneCountry?.iso2 ?? "",
      phoneNumber: normalizePhoneLocalNumber(normalizedInitialPhone),
    };
  }

  const matchedCountry = PHONE_COUNTRIES_BY_DIAL_CODE.find((country) =>
    normalizedInitialPhone.startsWith(country.dialCode),
  );
  if (!matchedCountry) {
    return {
      countryIso2: defaultPhoneCountry?.iso2 ?? "",
      phoneNumber: normalizePhoneLocalNumber(normalizedInitialPhone),
    };
  }

  const localPhoneNumber = normalizedInitialPhone.slice(
    matchedCountry.dialCode.length,
  );
  return {
    countryIso2: matchedCountry.iso2,
    phoneNumber: normalizePhoneLocalNumber(localPhoneNumber),
  };
};

const resetPasswordPhoneOtpSchema = z
  .object({
    countryIso2: z.string().trim().min(1, "Country code is required."),
    phoneNumber: z
      .string()
      .trim()
      .min(1, "Phone number is required."),
    otp: z
      .string()
      .min(4, "OTP is required.")
      .regex(/^\d+$/, "OTP must contain only digits."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm my password."),
  })
  .superRefine((values, ctx) => {
    const selectedCountry = getPhoneCountryByIso2(values.countryIso2);
    if (!selectedCountry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["countryIso2"],
        message: "Select a valid country code.",
      });
      return;
    }

    const e164PhoneNumber = getE164PhoneNumber(
      selectedCountry.iso2,
      values.phoneNumber,
    );

    if (!e164PhoneNumber || !phoneNumberRegex.test(e164PhoneNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "Enter a valid phone number for the selected country.",
      });
    }
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
  const initialPhoneFormValues = getInitialPhoneFormValues(initialPhoneNumber);
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
      countryIso2: initialPhoneFormValues.countryIso2,
      phoneNumber: initialPhoneFormValues.phoneNumber,
      otp: "",
      password: "",
      confirmPassword: "",
    },
  });
  const selectedCountryIso2 = form.watch("countryIso2");
  const selectedPhoneNumber = form.watch("phoneNumber");
  const countryFieldState = form.getFieldState("countryIso2", form.formState);
  const phoneFieldState = form.getFieldState("phoneNumber", form.formState);

  const onSendOtp = () => {
    setPendingAction("send");
    startTransition(async () => {
      try {
        const isPhoneValid = await form.trigger(["countryIso2", "phoneNumber"]);
        if (!isPhoneValid) return;
        const captchaToken = await runCaptchaForActionOrFail(
          "send-reset-phone-otp",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        const { countryIso2, phoneNumber: localPhoneNumber } = form.getValues();
        const phoneNumber = getE164PhoneNumber(countryIso2, localPhoneNumber);
        if (!phoneNumber || !phoneNumberRegex.test(phoneNumber)) {
          form.setError("phoneNumber", {
            message: "Enter a valid phone number for the selected country.",
          });
          return;
        }

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
          "countryIso2",
          "phoneNumber",
          "otp",
          "password",
          "confirmPassword",
        ]);
        if (!isValid) return;

        const values = form.getValues();
        const phoneNumber = getE164PhoneNumber(
          values.countryIso2,
          values.phoneNumber,
        );
        if (!phoneNumber || !phoneNumberRegex.test(phoneNumber)) {
          form.setError("phoneNumber", {
            message: "Enter a valid phone number for the selected country.",
          });
          return;
        }

        const result = await authClient.phoneNumber.resetPassword({
          otp: values.otp.trim(),
          phoneNumber,
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
    <div className="grid gap-6">
      <FieldGroup>
        <PhoneNumberWithCountryInput
          countryIso2={selectedCountryIso2}
          phoneNumber={selectedPhoneNumber}
          onCountryIso2Change={(countryIso2) => {
            form.setValue("countryIso2", countryIso2, {
              shouldDirty: true,
              shouldTouch: true,
            });
            form.clearErrors("countryIso2");
          }}
          onPhoneNumberChange={(phoneNumber) => {
            form.setValue("phoneNumber", phoneNumber, {
              shouldDirty: true,
              shouldTouch: true,
            });
          }}
          countryId="password-reset-phone-otp-country-code"
          phoneId="password-reset-phone-otp-phone"
          disabled={loading}
          countryAriaInvalid={countryFieldState.invalid}
          phoneAriaInvalid={phoneFieldState.invalid}
          countryError={
            countryFieldState.invalid ? (
              <FieldError errors={[countryFieldState.error]} />
            ) : null
          }
          phoneError={
            phoneFieldState.invalid ? (
              <FieldError errors={[phoneFieldState.error]} />
            ) : null
          }
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
          "Resend a verification code to my phone."
        ) : (
          "Send a verification code to my phone."
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
