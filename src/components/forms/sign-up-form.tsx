"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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

const signUpSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  otp: z.string().trim(),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;
type CaptchaAction = "sign-up-email-otp-send" | "sign-up-email-otp-verify";

interface SignUpFormProps {
  onSuccess?: () => void;
  params?: URLSearchParams;
}

export function SignUpForm({ onSuccess, params }: SignUpFormProps) {
  const [loading, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"send" | "create" | null>(
    null,
  );
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const {
    captchaRef,
    runCaptchaForActionOrFail,
    resetCaptcha,
    isCaptchaVisibleFor,
  } = useCaptchaAction<CaptchaAction>();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      otp: "",
    },
  });

  const watchedEmail = form.watch("email");
  const requestQuery = params
    ? Object.fromEntries(params.entries())
    : undefined;

  useEffect(() => {
    const normalizedEmail = watchedEmail.trim().toLowerCase();
    if (otpSentTo && normalizedEmail !== otpSentTo) {
      setOtpSentTo(null);
      form.setValue("otp", "");
    }
  }, [form, otpSentTo, watchedEmail]);

  const onSendVerificationCode = () => {
    setPendingAction("send");
    startTransition(async () => {
      try {
        const isEmailValid = await form.trigger("email");
        if (!isEmailValid) return;

        const captchaToken = await runCaptchaForActionOrFail(
          "sign-up-email-otp-send",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        const email = form.getValues("email").trim().toLowerCase();
        const { error } = await authClient.emailOtp.sendVerificationOtp(
          {
            email,
            type: "sign-in",
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
          },
        );

        if (error) {
          throw new Error(error.message);
        }

        setOtpSentTo(email);
        form.setValue("otp", "");
        toast.success("Verification code sent. Check your inbox and spam.");
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to send verification code.",
        );
      } finally {
        resetCaptcha();
        setPendingAction(null);
      }
    });
  };

  const onCreateAccount = () => {
    setPendingAction("create");
    startTransition(async () => {
      try {
        if (!otpSentTo) {
          toast.error("Send a verification code first.");
          return;
        }

        const otp = form.getValues("otp").trim();
        if (!otp || !/^\d+$/.test(otp)) {
          form.setError("otp", { message: "Enter a valid verification code." });
          return;
        }

        const captchaToken = await runCaptchaForActionOrFail(
          "sign-up-email-otp-verify",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        await authClient.signIn.emailOtp(
          {
            email: otpSentTo,
            otp,
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
            onSuccess() {
              toast.success("Account created. You're signed in.");
              onSuccess?.();
            },
            onError(context) {
              toast.error(context.error.message || "Failed to create account.");
            },
          },
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
        Enter your email and we&apos;ll send a verification code. After you
        confirm the code, we&apos;ll create your account.
      </p>

      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
              <Input
                {...field}
                id="sign-up-email"
                type="email"
                placeholder="m@example.com"
                aria-invalid={fieldState.invalid}
                autoComplete="email"
                disabled={loading}
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
        onClick={onSendVerificationCode}
      >
        {loading && pendingAction === "send" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : otpSentTo ? (
          "Resend verification code"
        ) : (
          "Email me a verification code"
        )}
      </Button>
      <CaptchaActionSlot
        show={isCaptchaVisibleFor("sign-up-email-otp-send")}
        captchaRef={captchaRef}
      />

      {otpSentTo && (
        <>
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Verification code sent to {otpSentTo}
            </p>
            <FieldGroup>
              <Controller
                name="otp"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="sign-up-email-otp">
                      Verification code
                    </FieldLabel>
                    <Input
                      {...field}
                      id="sign-up-email-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter verification code"
                      aria-invalid={fieldState.invalid}
                      maxLength={10}
                      disabled={loading}
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
              onClick={onCreateAccount}
            >
              {loading && pendingAction === "create" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Create my account"
              )}
            </Button>
            <CaptchaActionSlot
              show={isCaptchaVisibleFor("sign-up-email-otp-verify")}
              captchaRef={captchaRef}
            />
          </div>
        </>
      )}
    </div>
  );
}
