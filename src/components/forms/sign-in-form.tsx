"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot";
import { useCaptchaAction } from "@/components/captcha/use-captcha-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  buildMagicLinkSentURL,
  buildMagicLinkErrorCallbackURL,
  buildMagicLinkNewUserCallbackURL,
} from "@/lib/magic-link";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";
import { LastUsedIndicator } from "../last-used-indicator";

const subscribe = () => () => {};
const emailSchema = z.email("Please enter a valid email address.");
const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    "Enter a valid phone number in international format, e.g. +14155551234.",
  );

const normalizePhoneNumber = (value: string) => value.replace(/[()\s-]/g, "");
const syntheticEmailDomain = (
  process.env.NEXT_PUBLIC_BETTER_AUTH_PHONE_TEMP_EMAIL_DOMAIN || "phone.invalid"
)
  .trim()
  .toLowerCase();

const parsePhoneNumber = (value: string): string | null => {
  const normalized = normalizePhoneNumber(value);
  const parsed = phoneSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
};

const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email, phone number, or username is required."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean(),
});

type SignInFormValues = z.infer<typeof signInSchema>;
type CaptchaAction =
  | "password"
  | "magic"
  | "email-otp-send"
  | "email-otp-verify"
  | "phone-otp-send"
  | "phone-otp-verify";

interface SignInFormProps {
  onSuccess?: () => void;
  callbackURL?: string;
  showPasswordToggle?: boolean;
  params?: URLSearchParams;
  magicLinkNewUserCallbackURL?: string;
  magicLinkErrorCallbackURL?: string;
}

export function SignInForm({
  onSuccess,
  callbackURL = "/dashboard",
  showPasswordToggle = false,
  params,
  magicLinkNewUserCallbackURL,
  magicLinkErrorCallbackURL,
}: SignInFormProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<CaptchaAction | null>(
    null,
  );
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpSentTo, setEmailOtpSentTo] = useState<string | null>(null);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneOtpSentTo, setPhoneOtpSentTo] = useState<string | null>(null);
  const {
    captchaRef,
    runCaptchaForActionOrFail,
    resetCaptcha,
    isCaptchaVisibleFor,
  } = useCaptchaAction<CaptchaAction>();
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const newUserCallbackURL =
    magicLinkNewUserCallbackURL ??
    buildMagicLinkNewUserCallbackURL(callbackURL);
  const errorCallbackURL =
    magicLinkErrorCallbackURL ?? buildMagicLinkErrorCallbackURL(callbackURL);
  const requestQuery = params
    ? Object.fromEntries(params.entries())
    : undefined;

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
  });
  const verificationQuery = new URLSearchParams({
    callbackUrl: callbackURL,
  });
  const verificationIdentifier = form.watch("identifier");
  const normalizedIdentifier = verificationIdentifier?.trim() ?? "";
  const parsedIdentifierEmail = emailSchema.safeParse(normalizedIdentifier);
  const parsedIdentifierPhone = parsePhoneNumber(normalizedIdentifier);
  const isEmailIdentifier = parsedIdentifierEmail.success;
  const isSyntheticEmailIdentifier =
    isEmailIdentifier &&
    parsedIdentifierEmail.data.toLowerCase().endsWith(`@${syntheticEmailDomain}`);
  const isEmailOtpAvailable = isEmailIdentifier && !isSyntheticEmailIdentifier;
  const isPhoneIdentifier = Boolean(parsedIdentifierPhone);
  const isUsernameIdentifier =
    normalizedIdentifier.length > 0 &&
    !isEmailIdentifier &&
    !isPhoneIdentifier;

  if (isEmailOtpAvailable) {
    verificationQuery.set("email", parsedIdentifierEmail.data.toLowerCase());
  }
  const verifyEmailOtpHref = `/auth/email-otp/verify-email?${verificationQuery.toString()}`;

  useEffect(() => {
    if (!isEmailIdentifier) {
      setEmailOtpSentTo(null);
      setEmailOtpCode("");
    }
  }, [isEmailIdentifier]);

  useEffect(() => {
    if (!isPhoneIdentifier) {
      setPhoneOtpSentTo(null);
      setPhoneOtpCode("");
    }
  }, [isPhoneIdentifier]);

  const onSubmit = (data: SignInFormValues) => {
    setPendingAction("password");
    startTransition(async () => {
      try {
        const captchaToken = await runCaptchaForActionOrFail("password", () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        });
        if (captchaToken === undefined) return;
        const identifier = data.identifier.trim();
        const parsedEmail = emailSchema.safeParse(identifier);
        const parsedPhone = parsePhoneNumber(identifier);
        const fetchOptions = {
          query: requestQuery,
          headers: getCaptchaHeaders(captchaToken),
          onSuccess() {
            toast.success("Successfully signed in");
            onSuccess?.();
          },
          onError(context: { error: { message?: string } }) {
            const message = context.error.message || "Sign in failed.";
            if (message.toLowerCase().includes("email not verified")) {
              toast.error(
                "Email not verified. We sent a new verification email. Check your inbox and spam folder.",
              );
              return;
            }
            if (message.toLowerCase().includes("phone number not verified")) {
              toast.error(
                "Phone number not verified. We sent an OTP code to start verification.",
              );
              return;
            }
            toast.error(message);
          },
        };

        if (parsedEmail.success) {
          await authClient.signIn.email(
            {
              email: parsedEmail.data.toLowerCase(),
              password: data.password,
              rememberMe: data.rememberMe,
              callbackURL,
            },
            fetchOptions,
          );
          return;
        }

        if (parsedPhone) {
          await authClient.signIn.phoneNumber(
            {
              phoneNumber: parsedPhone,
              password: data.password,
              rememberMe: data.rememberMe,
            },
            fetchOptions,
          );
          return;
        }

        await authClient.signIn.username(
          {
            username: identifier,
            password: data.password,
            rememberMe: data.rememberMe,
            callbackURL,
          },
          fetchOptions,
        );
      } finally {
        resetCaptcha();
        setPendingAction(null);
      }
    });
  };

  const onMagicLink = () => {
    setPendingAction("magic");
    startTransition(async () => {
      try {
        const identifier = form.getValues("identifier").trim();
        const parsedEmail = emailSchema.safeParse(identifier);
        if (!parsedEmail.success) {
          toast.error("Enter a valid email to use magic link sign-in.");
          return;
        }
        const captchaToken = await runCaptchaForActionOrFail("magic", () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        });
        if (captchaToken === undefined) return;

        const email = parsedEmail.data.toLowerCase();
        await authClient.signIn.magicLink(
          {
            email,
            callbackURL,
            newUserCallbackURL: newUserCallbackURL,
            errorCallbackURL: errorCallbackURL,
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
            onSuccess() {
              router.push(buildMagicLinkSentURL(email, callbackURL));
            },
            onError(context) {
              if (context.error.status === 429) {
                toast.error("Too many requests. Please try again later.");
                return;
              }
              router.push(buildMagicLinkSentURL(email, callbackURL));
            },
          },
        );
      } finally {
        resetCaptcha();
        setPendingAction(null);
      }
    });
  };

  const onSendEmailOtp = () => {
    setPendingAction("email-otp-send");
    startTransition(async () => {
      try {
        const identifier = form.getValues("identifier").trim();
        const parsedEmail = emailSchema.safeParse(identifier);
        if (!parsedEmail.success) {
          toast.error("Enter a valid email to receive an OTP code.");
          return;
        }
        const captchaToken = await runCaptchaForActionOrFail(
          "email-otp-send",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        const email = parsedEmail.data.toLowerCase();
        if (email.endsWith(`@${syntheticEmailDomain}`)) {
          toast.error(
            "This is a phone-first placeholder email. Use phone OTP sign-in.",
          );
          return;
        }
        await authClient.emailOtp.sendVerificationOtp(
          {
            email,
            type: "sign-in",
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
            onSuccess() {
              setEmailOtpSentTo(email);
              setEmailOtpCode("");
              toast.success(
                "Email OTP sent. Check your inbox and spam folder.",
              );
            },
            onError(context) {
              if (context.error.status === 429) {
                toast.error("Too many requests. Please try again later.");
                return;
              }
              setEmailOtpSentTo(email);
              setEmailOtpCode("");
              toast.success(
                "If your account supports email OTP, check your inbox and spam folder.",
              );
            },
          },
        );
      } finally {
        resetCaptcha();
        setPendingAction(null);
      }
    });
  };

  const onSignInWithEmailOtp = () => {
    setPendingAction("email-otp-verify");
    startTransition(async () => {
      try {
        if (!emailOtpSentTo) {
          toast.error("Send an OTP code first.");
          return;
        }
        const captchaToken = await runCaptchaForActionOrFail(
          "email-otp-verify",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        const otp = emailOtpCode.trim();
        if (!otp || !/^\d+$/.test(otp)) {
          toast.error("Enter a valid OTP code.");
          return;
        }

        await authClient.signIn.emailOtp(
          {
            email: emailOtpSentTo,
            otp,
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
            onSuccess() {
              toast.success("Successfully signed in with email OTP");
              onSuccess?.();
            },
            onError(context) {
              toast.error(context.error.message || "Email OTP sign-in failed.");
            },
          },
        );
      } finally {
        resetCaptcha();
        setPendingAction(null);
      }
    });
  };

  const onSendPhoneOtp = () => {
    setPendingAction("phone-otp-send");
    startTransition(async () => {
      try {
        const identifier = form.getValues("identifier").trim();
        const phoneNumber = parsePhoneNumber(identifier);
        if (!phoneNumber) {
          toast.error(
            "Enter a valid phone number in international format, e.g. +14155551234.",
          );
          return;
        }
        const captchaToken = await runCaptchaForActionOrFail(
          "phone-otp-send",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        await authClient.phoneNumber.sendOtp(
          {
            phoneNumber,
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
            onSuccess() {
              setPhoneOtpSentTo(phoneNumber);
              setPhoneOtpCode("");
              toast.success("Phone OTP sent.");
            },
            onError(context) {
              toast.error(context.error.message || "Failed to send phone OTP.");
            },
          },
        );
      } finally {
        resetCaptcha();
        setPendingAction(null);
      }
    });
  };

  const onSignInWithPhoneOtp = () => {
    setPendingAction("phone-otp-verify");
    startTransition(async () => {
      try {
        if (!phoneOtpSentTo) {
          toast.error("Send a phone OTP first.");
          return;
        }
        const captchaToken = await runCaptchaForActionOrFail(
          "phone-otp-verify",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        const code = phoneOtpCode.trim();
        if (!code || !/^\d+$/.test(code)) {
          toast.error("Enter a valid OTP code.");
          return;
        }

        await authClient.phoneNumber.verify(
          {
            phoneNumber: phoneOtpSentTo,
            code,
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
            onSuccess() {
              toast.success("Phone verification successful. Signed in.");
              onSuccess?.();
            },
            onError(context) {
              toast.error(
                context.error.message || "Phone OTP verification failed.",
              );
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2">
      <FieldGroup>
        <Controller
          name="identifier"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-in-identifier">
                Email, Phone, or Username
              </FieldLabel>
              <Input
                {...field}
                id="sign-in-identifier"
                type="text"
                placeholder="m@example.com, +14155551234, or your.username"
                aria-invalid={fieldState.invalid}
                autoCapitalize="none"
                autoComplete="username"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <p className="text-xs text-muted-foreground">
          {isEmailIdentifier
            ? isSyntheticEmailIdentifier
              ? "This looks like a phone-first placeholder email. Use phone OTP or username/password."
              : "Email options are available below."
            : isPhoneIdentifier
              ? "Phone OTP options are available below."
              : isUsernameIdentifier
                ? "Username/password sign-in is available. Use an email or phone number to unlock channel-specific OTP options."
                : "Enter email, phone number, or username."}
        </p>
        <div className="text-right">
          {isEmailOtpAvailable ? (
            <Link
              href={verifyEmailOtpHref}
              className="inline-block text-xs underline text-foreground"
            >
              Verify email with OTP
            </Link>
          ) : (
            <span className="inline-block text-xs text-muted-foreground">
              Enter a real email to verify via OTP.
            </span>
          )}
        </div>
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center">
                <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
                <Link
                  href="/auth/forget-password"
                  className="ml-auto inline-block text-sm underline text-foreground"
                >
                  Forgot my password?
                </Link>
              </div>
              {showPasswordToggle ? (
                <PasswordInput
                  {...field}
                  id="sign-in-password"
                  placeholder="Password"
                  aria-invalid={fieldState.invalid}
                  autoComplete="current-password"
                />
              ) : (
                <Input
                  {...field}
                  id="sign-in-password"
                  type="password"
                  placeholder="password"
                  aria-invalid={fieldState.invalid}
                  autoComplete="current-password"
                />
              )}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="rememberMe"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id="sign-in-remember"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldLabel htmlFor="sign-in-remember" className="font-normal">
                Remember me
              </FieldLabel>
            </Field>
          )}
        />
      </FieldGroup>
      <Button type="submit" className="w-full relative" disabled={loading}>
        {loading && pendingAction === "password" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isPhoneIdentifier ? (
          "Login with phone + password"
        ) : isUsernameIdentifier ? (
          "Login with username + password"
        ) : (
          "Login"
        )}
        {isMounted &&
          (authClient.isLastUsedLoginMethod("email") ||
            authClient.isLastUsedLoginMethod("username") ||
            authClient.isLastUsedLoginMethod("phone-number")) && (
            <LastUsedIndicator />
          )}
      </Button>
      <CaptchaActionSlot
        show={isCaptchaVisibleFor("password")}
        captchaRef={captchaRef}
      />

      {isEmailOtpAvailable && (
        <>
          {/* Separation Line */}
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                OR SIGN IN WITH AN EMAIL LINK
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full relative"
            disabled={loading}
            onClick={onMagicLink}
          >
            {loading && pendingAction === "magic" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Email me a magic link"
            )}
            {isMounted && authClient.isLastUsedLoginMethod("magic-link") && (
              <LastUsedIndicator />
            )}
          </Button>
          <CaptchaActionSlot
            show={isCaptchaVisibleFor("magic")}
            captchaRef={captchaRef}
          />
        </>
      )}

      {isEmailOtpAvailable && (
        <>
          {/* Separation Line */}
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                OR SIGN IN WITH AN EMAIL VERIFICATION CODE
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full relative"
            disabled={loading}
            onClick={onSendEmailOtp}
          >
            {loading && pendingAction === "email-otp-send" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : emailOtpSentTo ? (
              "Resend email OTP"
            ) : (
              "Email me a code"
            )}
            {isMounted && authClient.isLastUsedLoginMethod("email-otp") && (
              <LastUsedIndicator />
            )}
          </Button>
          <CaptchaActionSlot
            show={isCaptchaVisibleFor("email-otp-send")}
            captchaRef={captchaRef}
          />
          {emailOtpSentTo && (
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                OTP sent to {emailOtpSentTo}
              </p>
              <Field>
                <FieldLabel htmlFor="sign-in-email-otp">Email OTP</FieldLabel>
                <Input
                  id="sign-in-email-otp"
                  value={emailOtpCode}
                  onChange={(event) =>
                    setEmailOtpCode(event.target.value.replace(/[^\d]/g, ""))
                  }
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter OTP code"
                  maxLength={10}
                />
              </Field>
              <Button
                type="button"
                className="w-full"
                disabled={loading}
                onClick={onSignInWithEmailOtp}
              >
                {loading && pendingAction === "email-otp-verify" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Sign in with Email OTP"
                )}
              </Button>
              <CaptchaActionSlot
                show={isCaptchaVisibleFor("email-otp-verify")}
                captchaRef={captchaRef}
              />
            </div>
          )}
        </>
      )}

      {isPhoneIdentifier && (
        <>
          {/* Separation Line */}
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                OR SIGN IN / SIGN UP WITH PHONE OTP
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full relative"
            disabled={loading}
            onClick={onSendPhoneOtp}
          >
            {loading && pendingAction === "phone-otp-send" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : phoneOtpSentTo ? (
              "Resend phone OTP"
            ) : (
              "Send OTP to phone"
            )}
          </Button>
          <CaptchaActionSlot
            show={isCaptchaVisibleFor("phone-otp-send")}
            captchaRef={captchaRef}
          />
          {phoneOtpSentTo && (
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                OTP sent to {phoneOtpSentTo}
              </p>
              <Field>
                <FieldLabel htmlFor="sign-in-phone-otp">Phone OTP</FieldLabel>
                <Input
                  id="sign-in-phone-otp"
                  value={phoneOtpCode}
                  onChange={(event) =>
                    setPhoneOtpCode(event.target.value.replace(/[^\d]/g, ""))
                  }
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter OTP code"
                  maxLength={10}
                />
              </Field>
              <Button
                type="button"
                className="w-full"
                disabled={loading}
                onClick={onSignInWithPhoneOtp}
              >
                {loading && pendingAction === "phone-otp-verify" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Verify phone OTP"
                )}
              </Button>
              <CaptchaActionSlot
                show={isCaptchaVisibleFor("phone-otp-verify")}
                captchaRef={captchaRef}
              />
            </div>
          )}
        </>
      )}

      {!isEmailIdentifier && !isPhoneIdentifier && (
        <p className="text-xs text-muted-foreground">
          Tip: use an email to sign in with magic link/email OTP, or use a
          phone number in E.164 format to sign in or sign up with phone OTP.
        </p>
      )}
    </form>
  );
}
