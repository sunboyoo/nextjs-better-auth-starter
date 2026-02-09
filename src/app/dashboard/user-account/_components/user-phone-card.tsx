"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot";
import { useCaptchaAction } from "@/components/captcha/use-captcha-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Phone,
  ShieldCheck,
  ShieldX,
  XCircle,
} from "lucide-react";

interface UserPhoneCardProps {
  phoneNumber: string | null | undefined;
  phoneNumberVerified: boolean | null | undefined;
}

type StatusState = "idle" | "loading" | "success" | "error";
type CaptchaAction = "send-phone-otp" | "verify-phone-otp";

const phoneNumberRegex = /^\+[1-9]\d{7,14}$/;
const normalizePhoneDigits = (value: string) => value.replace(/[^\d]/g, "");
const normalizeE164PhoneNumber = (value: string) => {
  const digits = normalizePhoneDigits(value);
  return digits ? `+${digits}` : "";
};

const sortedPhoneCountriesByDialCodeLength = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length,
);

const getPhoneCountryByIso2 = (countryIso2: string) =>
  PHONE_COUNTRIES.find((country) => country.iso2 === countryIso2);

const findPhoneCountryByPhoneNumber = (
  phoneNumber: string,
): PhoneCountry | null => {
  const normalized = normalizeE164PhoneNumber(phoneNumber);
  if (!normalized) return null;

  return (
    sortedPhoneCountriesByDialCodeLength.find((country) =>
      normalized.startsWith(country.dialCode),
    ) ?? null
  );
};

const getLocalPhoneNumberFromE164 = (
  phoneNumber: string,
  country: PhoneCountry | null,
) => {
  const normalized = normalizeE164PhoneNumber(phoneNumber);
  if (!normalized) return "";

  if (country && normalized.startsWith(country.dialCode)) {
    return normalized.slice(country.dialCode.length);
  }

  return normalized.slice(1);
};

const buildE164PhoneNumber = (
  countryIso2: string,
  localPhoneNumber: string,
): string | null => {
  const country = getPhoneCountryByIso2(countryIso2);
  if (!country) return null;

  const localDigits = normalizePhoneDigits(localPhoneNumber);
  if (!localDigits) return null;

  return `${country.dialCode}${localDigits}`;
};

const formatNationalPhoneNumber = (digits: string, dialCode: string) => {
  if (!digits) return "";

  if (dialCode === "+1" && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
};

const formatPhoneNumberForDisplay = (phoneNumber: string) => {
  const normalized = normalizeE164PhoneNumber(phoneNumber);
  if (!normalized) return "Not set";

  const country = findPhoneCountryByPhoneNumber(normalized);
  if (!country) return normalized;

  const localDigits = getLocalPhoneNumberFromE164(normalized, country);
  const formattedNational = formatNationalPhoneNumber(
    localDigits,
    country.dialCode,
  );
  return formattedNational
    ? `${country.dialCode} ${formattedNational}`
    : country.dialCode;
};

export function UserPhoneCard({
  phoneNumber,
  phoneNumberVerified,
}: UserPhoneCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const defaultPhoneCountry =
    getPhoneCountryByIso2(DEFAULT_PHONE_COUNTRY_ISO2) ?? PHONE_COUNTRIES[0];
  const currentPhoneCountry = phoneNumber
    ? findPhoneCountryByPhoneNumber(phoneNumber)
    : null;
  const initialPhoneCountry = currentPhoneCountry ?? defaultPhoneCountry;
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countryIso2, setCountryIso2] = useState(initialPhoneCountry?.iso2 ?? "");
  const [newPhoneLocalNumber, setNewPhoneLocalNumber] = useState(
    getLocalPhoneNumberFromE164(phoneNumber ?? "", initialPhoneCountry),
  );
  const [otpCode, setOtpCode] = useState("");
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState>("idle");
  const [message, setMessage] = useState("");
  const {
    captchaRef,
    runCaptchaForActionOrFail,
    resetCaptcha,
    isCaptchaVisibleFor,
  } = useCaptchaAction<CaptchaAction>();

  const selectedPhoneCountry =
    getPhoneCountryByIso2(countryIso2) ?? initialPhoneCountry;
  const normalizedCurrentPhone = normalizeE164PhoneNumber(phoneNumber ?? "");
  const normalizedNewPhone = buildE164PhoneNumber(
    countryIso2,
    newPhoneLocalNumber,
  );
  const formattedCurrentPhone = phoneNumber
    ? formatPhoneNumberForDisplay(phoneNumber)
    : "No phone number set";

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!normalizedNewPhone || !phoneNumberRegex.test(normalizedNewPhone)) {
      setStatus("error");
      setMessage("Enter a valid phone number for the selected country.");
      return;
    }

    if (phoneNumberVerified && normalizedNewPhone === normalizedCurrentPhone) {
      setStatus("error");
      setMessage("This phone number is already verified.");
      return;
    }

    setStatus("loading");
    setMessage("Sending OTP code...");

    try {
      const captchaToken = await runCaptchaForActionOrFail(
        "send-phone-otp",
        () => {
          setStatus("error");
          setMessage(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        },
      );
      if (captchaToken === undefined) return;

      const { error } = await authClient.phoneNumber.sendOtp(
        {
          phoneNumber: normalizedNewPhone,
        },
        {
          headers: getCaptchaHeaders(captchaToken),
        },
      );
      if (error) {
        throw new Error(error.message);
      }

      setOtpSentTo(normalizedNewPhone);
      setOtpCode("");
      setStatus("success");
      setMessage(
        "OTP sent. Enter it below to verify and update your phone number.",
      );
    } catch (error: unknown) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      resetCaptcha();
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpSentTo) {
      setStatus("error");
      setMessage("Send OTP first.");
      return;
    }
    if (!otpCode.trim() || !/^\d+$/.test(otpCode.trim())) {
      setStatus("error");
      setMessage("Enter a valid OTP code.");
      return;
    }

    setStatus("loading");
    setMessage("Verifying OTP...");

    try {
      const captchaToken = await runCaptchaForActionOrFail(
        "verify-phone-otp",
        () => {
          setStatus("error");
          setMessage(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        },
      );
      if (captchaToken === undefined) return;

      const { error } = await authClient.phoneNumber.verify(
        {
          phoneNumber: otpSentTo,
          code: otpCode.trim(),
          updatePhoneNumber: true,
        },
        {
          headers: getCaptchaHeaders(captchaToken),
        },
      );
      if (error) {
        throw new Error(error.message);
      }

      setStatus("success");
      setMessage("Phone number updated and verified.");
      setTimeout(() => {
        router.refresh();
        setIsExpanded(false);
        setOtpSentTo(null);
        setOtpCode("");
        setStatus("idle");
        setMessage("");
      }, 1200);
    } catch (error: unknown) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to verify phone number",
      );
    } finally {
      resetCaptcha();
    }
  };

  const resetForm = () => {
    setCountryIso2(initialPhoneCountry?.iso2 ?? "");
    setNewPhoneLocalNumber(
      getLocalPhoneNumberFromE164(phoneNumber ?? "", initialPhoneCountry),
    );
    setCountryPickerOpen(false);
    setOtpCode("");
    setOtpSentTo(null);
    setStatus("idle");
    setMessage("");
    resetCaptcha();
  };

  return (
    <Card className="overflow-hidden transition-all py-0 gap-0 border-0 shadow-none">
      <CardContent
        className="group flex cursor-pointer items-center justify-between gap-4 p-6"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold tabular-nums">
                {formattedCurrentPhone}
              </h2>
              {phoneNumber ? (
                phoneNumberVerified ? (
                  <Badge
                    variant="default"
                    className="gap-1 bg-green-600 px-1.5 py-0 text-[10px] font-medium"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="gap-1 px-1.5 py-0 text-[10px] font-medium"
                  >
                    <ShieldX className="h-3 w-3" />
                    Unverified
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  Not configured
                </Badge>
              )}
            </div>
            {phoneNumber ? (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {currentPhoneCountry ? (
                  <Avatar className="h-3.5 w-5 rounded-[2px]">
                    <AvatarImage
                      src={currentPhoneCountry.flagImageUrl}
                      alt={`${currentPhoneCountry.name} flag`}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-[2px] text-[8px]">
                      {currentPhoneCountry.iso2}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <span className="font-mono">{normalizedCurrentPhone}</span>
                {currentPhoneCountry ? (
                  <span>• {currentPhoneCountry.name}</span>
                ) : null}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Use phone OTP for sign-in and recovery
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:text-primary ${isExpanded ? "rotate-180" : ""}`}
        />
      </CardContent>

      {isExpanded && (
        <div className="border-t p-6 rounded-b-xl bg-muted/10">
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone-number-current">Current Phone</Label>
                <div
                  id="phone-number-current"
                  className="rounded-md border bg-background px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {currentPhoneCountry ? (
                      <Avatar className="h-4 w-6 rounded-[2px]">
                        <AvatarImage
                          src={currentPhoneCountry.flagImageUrl}
                          alt={`${currentPhoneCountry.name} flag`}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-[2px] text-[8px]">
                          {currentPhoneCountry.iso2}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                    <p className="text-sm font-medium tabular-nums">
                      {formattedCurrentPhone}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">
                    {phoneNumber ? normalizedCurrentPhone : "Not set"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone-number-new-local">New Phone Number</Label>
                <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor="phone-number-country-code">Country code</Label>
                    <Popover
                      open={countryPickerOpen}
                      onOpenChange={setCountryPickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="phone-number-country-code"
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={countryPickerOpen}
                          disabled={status === "loading"}
                          className="w-full justify-between gap-2 font-normal"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {selectedPhoneCountry ? (
                              <Avatar className="h-4 w-6 rounded-[2px]">
                                <AvatarImage
                                  src={selectedPhoneCountry.flagImageUrl}
                                  alt={`${selectedPhoneCountry.name} flag`}
                                  className="object-cover"
                                />
                                <AvatarFallback className="rounded-[2px] text-[8px]">
                                  {selectedPhoneCountry.iso2}
                                </AvatarFallback>
                              </Avatar>
                            ) : null}
                            <span className="truncate">
                              {selectedPhoneCountry
                                ? selectedPhoneCountry.name
                                : "Select country"}
                            </span>
                          </span>
                          {selectedPhoneCountry ? (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {selectedPhoneCountry.dialCode}
                            </span>
                          ) : null}
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search country or dial code..." />
                          <CommandList>
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                              {PHONE_COUNTRIES.map((country) => (
                                <CommandItem
                                  key={country.iso2}
                                  value={`${country.name} ${country.dialCode} ${country.iso2}`}
                                  onSelect={() => {
                                    if (status === "loading") return;
                                    setCountryIso2(country.iso2);
                                    setCountryPickerOpen(false);
                                  }}
                                >
                                  <Avatar className="h-4 w-6 rounded-[2px]">
                                    <AvatarImage
                                      src={country.flagImageUrl}
                                      alt=""
                                      aria-hidden
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="rounded-[2px] text-[8px]">
                                      {country.iso2}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate">{country.name}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {country.dialCode}
                                  </span>
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      country.iso2 === countryIso2
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-number-new-local">Phone number</Label>
                    <Input
                      id="phone-number-new-local"
                      type="tel"
                      placeholder="415 555 1234"
                      inputMode="tel"
                      autoComplete="tel-national"
                      value={newPhoneLocalNumber}
                      onChange={(event) =>
                        setNewPhoneLocalNumber(
                          event.target.value.replace(/[^\d()\s-]/g, ""),
                        )
                      }
                      disabled={status === "loading"}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {normalizedNewPhone
                    ? `Will be saved as ${normalizedNewPhone}`
                    : "Enter your phone number to receive an OTP."}
                </p>
              </div>
              {otpSentTo && (
                <div className="space-y-2">
                  <Label htmlFor="phone-number-otp">OTP Code</Label>
                  <Input
                    id="phone-number-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter OTP code"
                    value={otpCode}
                    onChange={(event) =>
                      setOtpCode(event.target.value.replace(/[^\d]/g, ""))
                    }
                    disabled={status === "loading"}
                    maxLength={10}
                  />
                </div>
              )}
            </div>

            {message && (
              <div
                className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                  status === "loading"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : status === "success"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : status === "error"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : ""
                }`}
              >
                {status === "loading" && (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
                )}
                {status === "success" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                {status === "error" && (
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={status === "loading"}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={status === "loading"}
              >
                {otpSentTo ? "Resend OTP" : "Send OTP"}
              </Button>
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={status === "loading" || !otpSentTo}
              >
                Verify & Update
              </Button>
            </div>
            <CaptchaActionSlot
              show={isCaptchaVisibleFor("send-phone-otp")}
              captchaRef={captchaRef}
            />
            <CaptchaActionSlot
              show={isCaptchaVisibleFor("verify-phone-otp")}
              captchaRef={captchaRef}
            />
          </form>
        </div>
      )}
    </Card>
  );
}
