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
import {
  defaultPhoneCountry,
  getE164PhoneNumber,
  getPhoneCountryByIso2,
  PhoneNumberWithCountryInput,
} from "@/components/forms/phone-number-with-country-input";
import { authClient } from "@/lib/auth-client";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";

const phoneNumberRegex = /^\+[1-9]\d{7,14}$/;

const phoneSignUpSchema = z
  .object({
    countryIso2: z.string().trim().min(1, "Country code is required."),
    phoneNumber: z.string().trim().min(1, "Phone number is required."),
    otp: z.string().trim(),
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
      countryIso2: defaultPhoneCountry?.iso2 ?? "",
      phoneNumber: "",
      otp: "",
    },
  });
  const selectedCountryIso2 = form.watch("countryIso2");
  const selectedPhoneNumber = form.watch("phoneNumber");
  const countryFieldState = form.getFieldState("countryIso2", form.formState);
  const phoneFieldState = form.getFieldState("phoneNumber", form.formState);

  const requestQuery = params
    ? Object.fromEntries(params.entries())
    : undefined;

  const onSendOtp = () => {
    setPendingAction("send");
    startTransition(async () => {
      try {
        const isPhoneValid = await form.trigger(["countryIso2", "phoneNumber"]);
        if (!isPhoneValid) return;

        const captchaToken = await runCaptchaForActionOrFail(
          "phone-sign-up-send-otp",
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
        toast.success("Verification code sent to your phone.");
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to send verification code",
        );
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
          toast.error("Send a verification code first.");
          return;
        }

        const otp = form.getValues("otp").trim();
        if (!otp || !/^\d+$/.test(otp)) {
          form.setError("otp", {
            message: "Enter a valid verification code.",
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
          error instanceof Error ? error.message : "Failed to verify code",
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
        Sign up with your phone number. Choose your country code, enter your
        number, and we&apos;ll send a verification code to verify your account.
      </p>

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
          countryId="phone-sign-up-country-code"
          phoneId="phone-sign-up-number"
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
        className="w-full"
        disabled={loading}
        onClick={onSendOtp}
      >
        {loading && pendingAction === "send" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : otpSentTo ? (
          "Resend a verification code to my phone."
        ) : (
          "Send a verification code to my phone."
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
                  <FieldLabel htmlFor="phone-sign-up-otp">
                    Verification code
                  </FieldLabel>
                  <Input
                    {...field}
                    id="phone-sign-up-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter verification code"
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
              "Create my account"
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
