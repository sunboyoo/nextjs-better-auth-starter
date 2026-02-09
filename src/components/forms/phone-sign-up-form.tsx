"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot";
import { useCaptchaAction } from "@/components/captcha/use-captcha-action";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  PHONE_COUNTRIES,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";

const phoneNumberRegex = /^\+[1-9]\d{7,14}$/;

const normalizePhoneNumber = (value: string) => value.replace(/[^\d]/g, "");
const getPhoneCountryByIso2 = (countryIso2: string) =>
  PHONE_COUNTRIES.find((country) => country.iso2 === countryIso2);

const defaultPhoneCountry =
  getPhoneCountryByIso2(DEFAULT_PHONE_COUNTRY_ISO2) ?? PHONE_COUNTRIES[0];

const getE164PhoneNumber = (
  countryIso2: string,
  localPhoneNumber: string,
): string | null => {
  const selectedCountry = getPhoneCountryByIso2(countryIso2);
  if (!selectedCountry) return null;

  const normalizedLocalPhone = normalizePhoneNumber(localPhoneNumber);
  if (!normalizedLocalPhone) return null;

  return `${selectedCountry.dialCode}${normalizedLocalPhone}`;
};

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
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
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
  const selectedCountry =
    getPhoneCountryByIso2(selectedCountryIso2) ?? defaultPhoneCountry;

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
        number, and we&apos;ll send an OTP to verify your account.
      </p>

      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <Controller
            name="countryIso2"
            control={form.control}
            render={({ field, fieldState }) => {
              const country = getPhoneCountryByIso2(field.value) ?? selectedCountry;
              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="phone-sign-up-country-code">
                    Country code
                  </FieldLabel>
                  <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="phone-sign-up-country-code"
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryPickerOpen}
                        aria-invalid={fieldState.invalid}
                        className="w-full justify-between gap-2 font-normal"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {country ? (
                            <Avatar className="h-4 w-6 rounded-[2px]">
                              <AvatarImage
                                src={country.flagImageUrl}
                                alt={`${country.name} flag`}
                                className="object-cover"
                              />
                              <AvatarFallback className="rounded-[2px] text-[8px]">
                                {country.iso2}
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                          <span className="truncate">
                            {country ? country.name : "Select country"}
                          </span>
                        </span>
                        {country ? (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {country.dialCode}
                          </span>
                        ) : null}
                        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search country or dial code..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {PHONE_COUNTRIES.map((phoneCountry) => (
                              <CommandItem
                                key={phoneCountry.iso2}
                                value={`${phoneCountry.name} ${phoneCountry.dialCode} ${phoneCountry.iso2}`}
                                onSelect={() => {
                                  field.onChange(phoneCountry.iso2);
                                  form.clearErrors("countryIso2");
                                  setCountryPickerOpen(false);
                                }}
                              >
                                <Avatar className="h-4 w-6 rounded-[2px]">
                                  <AvatarImage
                                    src={phoneCountry.flagImageUrl}
                                    alt=""
                                    aria-hidden
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="rounded-[2px] text-[8px]">
                                    {phoneCountry.iso2}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{phoneCountry.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {phoneCountry.dialCode}
                                </span>
                                <Check
                                  className={cn(
                                    "size-4",
                                    phoneCountry.iso2 === field.value
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />
          <Controller
            name="phoneNumber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="phone-sign-up-number">Phone number</FieldLabel>
                <Input
                  {...field}
                  id="phone-sign-up-number"
                  type="tel"
                  placeholder="415 555 1234"
                  inputMode="tel"
                  aria-invalid={fieldState.invalid}
                  autoComplete="tel-national"
                  onChange={(event) =>
                    field.onChange(event.target.value.replace(/[^\d()\s-]/g, ""))
                  }
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
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
