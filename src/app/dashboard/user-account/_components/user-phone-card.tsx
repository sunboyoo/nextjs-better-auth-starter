"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot";
import { useCaptchaAction } from "@/components/captcha/use-captcha-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";
import {
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
const normalizePhoneNumber = (value: string) => value.replace(/[()\s-]/g, "");

export function UserPhoneCard({
  phoneNumber,
  phoneNumberVerified,
}: UserPhoneCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState(phoneNumber ?? "");
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

  const normalizedCurrentPhone = phoneNumber
    ? normalizePhoneNumber(phoneNumber)
    : "";
  const normalizedNewPhone = normalizePhoneNumber(newPhoneNumber.trim());

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!normalizedNewPhone || !phoneNumberRegex.test(normalizedNewPhone)) {
      setStatus("error");
      setMessage(
        "Enter a valid phone number in international format, e.g. +14155551234.",
      );
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
    setNewPhoneNumber(phoneNumber ?? "");
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
              <h2 className="text-sm font-semibold">
                {phoneNumber || "No phone number set"}
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
        <div
          className="border-t p-6 rounded-b-xl"
          style={{ backgroundColor: "#fcfcfc" }}
        >
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone-number-current">Current Phone</Label>
                <Input
                  id="phone-number-current"
                  type="text"
                  value={phoneNumber || "Not set"}
                  disabled
                  className="bg-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone-number-new">New Phone Number</Label>
                <Input
                  id="phone-number-new"
                  type="tel"
                  placeholder="+14155551234"
                  value={newPhoneNumber}
                  onChange={(event) => setNewPhoneNumber(event.target.value)}
                  disabled={status === "loading"}
                  autoComplete="tel"
                />
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
                Send OTP
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
