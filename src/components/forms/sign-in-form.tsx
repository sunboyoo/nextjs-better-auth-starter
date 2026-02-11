"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, type ReadonlyURLSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot";
import { useCaptchaAction } from "@/components/captcha/use-captcha-action";
import {
  defaultPhoneCountry,
  getE164PhoneNumber,
  getPhoneCountryByIso2,
  parseE164PhoneNumber,
  PhoneNumberWithCountryInput,
} from "@/components/forms/phone-number-with-country-input";
import { LastUsedIndicator } from "@/components/last-used-indicator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthenticationMethod } from "@/config/authentication/types";
import { authClient } from "@/lib/auth-client";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";
import {
  buildMagicLinkErrorCallbackURL,
  buildMagicLinkNewUserCallbackURL,
  buildMagicLinkSentURL,
} from "@/lib/magic-link";

const subscribe = () => () => { };
const emailSchema = z.email("Please enter a valid email address.");
const syntheticEmailDomain = (
  process.env.NEXT_PUBLIC_BETTER_AUTH_PHONE_TEMP_EMAIL_DOMAIN || "phone.invalid"
)
  .trim()
  .toLowerCase();

const signInSchema = z.object({
  email: z.string().trim(),
  phoneCountryIso2: z.string().trim(),
  phoneNumber: z.string().trim(),
  username: z.string().trim(),
  password: z.string().trim(),
  rememberMe: z.boolean(),
});

type SignInFormValues = z.infer<typeof signInSchema>;
export type IdentifierTab = "email" | "phone" | "username";
type CaptchaAction =
  | "password"
  | "magic"
  | "email-otp-send"
  | "email-otp-verify"
  | "phone-otp-send"
  | "phone-otp-verify";

const DEFAULT_IDENTIFIER_TABS: readonly IdentifierTab[] = [
  "email",
  "phone",
  "username",
];

const DEFAULT_ALLOWED_METHODS: readonly AuthenticationMethod[] = [
  "password",
  "magicLink",
  "emailOtp",
  "smsOtp",
];

interface FixedIdentifier {
  type: IdentifierTab;
  value: string;
}

interface SignInFormProps {
  onSuccess?: () => void;
  callbackURL?: string;
  showPasswordToggle?: boolean;
  params?: URLSearchParams | ReadonlyURLSearchParams;
  magicLinkNewUserCallbackURL?: string;
  magicLinkErrorCallbackURL?: string;
  allowedIdentifierTabs?: readonly IdentifierTab[];
  allowedMethods?: readonly AuthenticationMethod[];
  fixedIdentifier?: FixedIdentifier | null;
  hideIdentifierTabs?: boolean;
}

export function SignInForm({
  onSuccess,
  callbackURL = "/dashboard",
  showPasswordToggle = false,
  params,
  magicLinkNewUserCallbackURL,
  magicLinkErrorCallbackURL,
  allowedIdentifierTabs,
  allowedMethods = DEFAULT_ALLOWED_METHODS,
  fixedIdentifier = null,
  hideIdentifierTabs = false,
}: SignInFormProps) {
  const router = useRouter();
  const availableIdentifierTabs = useMemo(() => {
    const requestedTabs =
      allowedIdentifierTabs?.length
        ? allowedIdentifierTabs
        : DEFAULT_IDENTIFIER_TABS;

    const uniqueTabs = Array.from(new Set(requestedTabs)) as IdentifierTab[];

    if (fixedIdentifier && !uniqueTabs.includes(fixedIdentifier.type)) {
      uniqueTabs.unshift(fixedIdentifier.type);
    }

    return uniqueTabs.filter((tab) => DEFAULT_IDENTIFIER_TABS.includes(tab));
  }, [allowedIdentifierTabs, fixedIdentifier]);
  const initialIdentifierTab = fixedIdentifier?.type
    ? fixedIdentifier.type
    : availableIdentifierTabs[0] ?? "email";
  const [activeIdentifierTab, setActiveIdentifierTab] =
    useState<IdentifierTab>(initialIdentifierTab);
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
  const allowedMethodSet = useMemo(
    () => new Set<AuthenticationMethod>(allowedMethods),
    [allowedMethods],
  );
  const passwordMethodEnabled = allowedMethodSet.has("password");
  const magicLinkMethodEnabled = allowedMethodSet.has("magicLink");
  const emailOtpMethodEnabled = allowedMethodSet.has("emailOtp");
  const smsOtpMethodEnabled = allowedMethodSet.has("smsOtp");

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      phoneCountryIso2: defaultPhoneCountry?.iso2 ?? "",
      phoneNumber: "",
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  useEffect(() => {
    if (!availableIdentifierTabs.length) {
      return;
    }

    if (!availableIdentifierTabs.includes(activeIdentifierTab)) {
      setActiveIdentifierTab(availableIdentifierTabs[0]);
    }
  }, [activeIdentifierTab, availableIdentifierTabs]);

  useEffect(() => {
    if (!fixedIdentifier) {
      return;
    }

    setActiveIdentifierTab(fixedIdentifier.type);
    const normalizedValue = fixedIdentifier.value.trim();

    if (fixedIdentifier.type === "email") {
      form.setValue("email", normalizedValue.toLowerCase(), {
        shouldDirty: false,
      });
      return;
    }

    if (fixedIdentifier.type === "phone") {
      const parsed = parseE164PhoneNumber(normalizedValue);
      if (parsed) {
        form.setValue("phoneCountryIso2", parsed.countryIso2, {
          shouldDirty: false,
        });
        form.setValue("phoneNumber", parsed.localNumber, {
          shouldDirty: false,
        });
      } else {
        form.setValue("phoneNumber", normalizedValue, {
          shouldDirty: false,
        });
      }
      return;
    }

    form.setValue("username", normalizedValue.toLowerCase(), {
      shouldDirty: false,
    });
  }, [fixedIdentifier, form]);

  const watchedEmail = form.watch("email");
  const watchedPhoneCountryIso2 = form.watch("phoneCountryIso2");
  const watchedPhoneNumber = form.watch("phoneNumber");
  const countryFieldState = form.getFieldState(
    "phoneCountryIso2",
    form.formState,
  );
  const phoneFieldState = form.getFieldState("phoneNumber", form.formState);
  const normalizedEmail = watchedEmail.trim().toLowerCase();
  const parsedEmail = emailSchema.safeParse(normalizedEmail);
  const isSyntheticEmailIdentifier =
    parsedEmail.success &&
    parsedEmail.data.toLowerCase().endsWith(`@${syntheticEmailDomain}`);
  const isEmailOtpAvailable = parsedEmail.success && !isSyntheticEmailIdentifier;
  const selectedPhoneNumber = getE164PhoneNumber(
    watchedPhoneCountryIso2,
    watchedPhoneNumber.trim(),
  );

  const verificationQuery = new URLSearchParams({
    callbackUrl: callbackURL,
  });
  const nextAfterProfileCompletion =
    callbackURL === "/dashboard/profile-completion" ? "/dashboard" : callbackURL;
  const profileCompletionRedirect = `/dashboard/profile-completion?next=${encodeURIComponent(nextAfterProfileCompletion)}`;
  if (isEmailOtpAvailable) {
    verificationQuery.set("email", parsedEmail.data.toLowerCase());
  }
  const verifyEmailOtpHref = `/auth/email-otp/verify-email?${verificationQuery.toString()}`;

  useEffect(() => {
    if (emailOtpSentTo && normalizedEmail !== emailOtpSentTo) {
      setEmailOtpSentTo(null);
      setEmailOtpCode("");
    }
  }, [emailOtpSentTo, normalizedEmail]);

  useEffect(() => {
    if (phoneOtpSentTo && selectedPhoneNumber !== phoneOtpSentTo) {
      setPhoneOtpSentTo(null);
      setPhoneOtpCode("");
    }
  }, [phoneOtpSentTo, selectedPhoneNumber]);

  const onSubmit = (data: SignInFormValues) => {
    if (!passwordMethodEnabled) {
      return;
    }

    const password = data.password.trim();
    if (!password) {
      form.setError("password", {
        message: "Password is required.",
      });
      return;
    }

    setPendingAction("password");
    startTransition(async () => {
      try {
        const captchaToken = await runCaptchaForActionOrFail("password", () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        });
        if (captchaToken === undefined) return;
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
                "Phone number not verified. We sent a verification code to start verification.",
              );
              return;
            }
            toast.error(message);
          },
        };

        if (activeIdentifierTab === "email") {
          const email = data.email.trim().toLowerCase();
          const parsed = emailSchema.safeParse(email);
          if (!parsed.success) {
            form.setError("email", {
              message: "Please enter a valid email address.",
            });
            return;
          }

          await authClient.signIn.email(
            {
              email: parsed.data,
              password,
              rememberMe: data.rememberMe,
              callbackURL,
            },
            fetchOptions,
          );
          return;
        }

        if (activeIdentifierTab === "phone") {
          if (!getPhoneCountryByIso2(data.phoneCountryIso2)) {
            form.setError("phoneCountryIso2", {
              message: "Select a valid country code.",
            });
            return;
          }

          const phoneNumber = getE164PhoneNumber(
            data.phoneCountryIso2,
            data.phoneNumber.trim(),
          );
          if (!phoneNumber) {
            form.setError("phoneNumber", {
              message:
                "Enter a valid phone number for the selected country.",
            });
            return;
          }

          await authClient.signIn.phoneNumber(
            {
              phoneNumber,
              password,
              rememberMe: data.rememberMe,
            },
            fetchOptions,
          );
          return;
        }

        const username = data.username.trim();
        if (!username) {
          form.setError("username", {
            message: "Username is required.",
          });
          return;
        }

        await authClient.signIn.username(
          {
            username,
            password,
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
    if (!magicLinkMethodEnabled) {
      return;
    }

    setPendingAction("magic");
    startTransition(async () => {
      try {
        const email = form.getValues("email").trim().toLowerCase();
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) {
          form.setError("email", {
            message: "Please enter a valid email address.",
          });
          return;
        }
        if (email.endsWith(`@${syntheticEmailDomain}`)) {
          toast.error(
            "This is a phone-first placeholder email. Use phone verification code sign-in.",
          );
          return;
        }

        const captchaToken = await runCaptchaForActionOrFail("magic", () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        });
        if (captchaToken === undefined) return;

        await authClient.signIn.magicLink(
          {
            email: parsed.data,
            callbackURL,
            newUserCallbackURL: newUserCallbackURL,
            errorCallbackURL: errorCallbackURL,
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
            onSuccess() {
              router.push(buildMagicLinkSentURL(parsed.data, callbackURL));
            },
            onError(context) {
              if (context.error.status === 429) {
                toast.error("Too many requests. Please try again later.");
                return;
              }
              router.push(buildMagicLinkSentURL(parsed.data, callbackURL));
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
    if (!emailOtpMethodEnabled) {
      return;
    }

    setPendingAction("email-otp-send");
    startTransition(async () => {
      try {
        const email = form.getValues("email").trim().toLowerCase();
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) {
          form.setError("email", {
            message: "Please enter a valid email address.",
          });
          return;
        }
        if (email.endsWith(`@${syntheticEmailDomain}`)) {
          toast.error(
            "This is a phone-first placeholder email. Use phone verification code sign-in.",
          );
          return;
        }

        const captchaToken = await runCaptchaForActionOrFail(
          "email-otp-send",
          () => {
            toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
          },
        );
        if (captchaToken === undefined) return;

        await authClient.emailOtp.sendVerificationOtp(
          {
            email: parsed.data,
            type: "sign-in",
          },
          {
            query: requestQuery,
            headers: getCaptchaHeaders(captchaToken),
            onSuccess() {
              setEmailOtpSentTo(parsed.data);
              setEmailOtpCode("");
              toast.success(
                "Verification code sent. Check your inbox and spam folder.",
              );
            },
            onError(context) {
              if (context.error.status === 429) {
                toast.error("Too many requests. Please try again later.");
                return;
              }
              setEmailOtpSentTo(parsed.data);
              setEmailOtpCode("");
              toast.success(
                "If your account supports verification codes, check your inbox and spam folder.",
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
    if (!emailOtpMethodEnabled) {
      return;
    }

    setPendingAction("email-otp-verify");
    startTransition(async () => {
      try {
        if (!emailOtpSentTo) {
          toast.error("Send a verification code first.");
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
          toast.error("Enter a valid verification code.");
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
              toast.success("Successfully signed in with email verification code");
              router.push(profileCompletionRedirect);
            },
            onError(context) {
              toast.error(
                context.error.message ||
                "Email verification code sign-in failed.",
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

  const onSendPhoneOtp = () => {
    if (!smsOtpMethodEnabled) {
      return;
    }

    setPendingAction("phone-otp-send");
    startTransition(async () => {
      try {
        const { phoneCountryIso2, phoneNumber: localPhoneNumber } =
          form.getValues();
        if (!getPhoneCountryByIso2(phoneCountryIso2)) {
          form.setError("phoneCountryIso2", {
            message: "Select a valid country code.",
          });
          return;
        }

        const phoneNumber = getE164PhoneNumber(
          phoneCountryIso2,
          localPhoneNumber.trim(),
        );
        if (!phoneNumber) {
          form.setError("phoneNumber", {
            message: "Enter a valid phone number for the selected country.",
          });
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
              toast.success("Verification code sent to your phone.");
            },
            onError(context) {
              toast.error(
                context.error.message || "Failed to send verification code.",
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

  const onSignInWithPhoneOtp = () => {
    if (!smsOtpMethodEnabled) {
      return;
    }

    setPendingAction("phone-otp-verify");
    startTransition(async () => {
      try {
        if (!phoneOtpSentTo) {
          toast.error("Send a verification code first.");
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
          toast.error("Enter a valid verification code.");
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
              router.push(profileCompletionRedirect);
            },
            onError(context) {
              toast.error(
                context.error.message ||
                "Phone verification code sign-in failed.",
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

  const showIdentifierTabs =
    !hideIdentifierTabs && availableIdentifierTabs.length > 1;
  const showEmailMethods =
    activeIdentifierTab === "email" &&
    (magicLinkMethodEnabled || emailOtpMethodEnabled);
  const showPhoneMethods =
    activeIdentifierTab === "phone" && smsOtpMethodEnabled;
  const emailMethodCopy = [
    passwordMethodEnabled ? "password" : null,
    emailOtpMethodEnabled ? "verification code" : null,
    magicLinkMethodEnabled ? "magic link" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const phoneMethodCopy = [
    passwordMethodEnabled ? "password" : null,
    smsOtpMethodEnabled ? "verification code" : null,
  ]
    .filter(Boolean)
    .join(" or ");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
      <FieldGroup>
        {!fixedIdentifier ? (
          <Tabs
            value={activeIdentifierTab}
            onValueChange={(value) => {
              const next = value as IdentifierTab;
              setActiveIdentifierTab(next);
              form.clearErrors([
                "email",
                "phoneCountryIso2",
                "phoneNumber",
                "username",
              ]);
            }}
            className="w-full"
          >
            {showIdentifierTabs && (
              <TabsList
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${availableIdentifierTabs.length}, minmax(0, 1fr))`,
                }}
              >
                {availableIdentifierTabs.includes("email") ? (
                  <TabsTrigger value="email">Email</TabsTrigger>
                ) : null}
                {availableIdentifierTabs.includes("phone") ? (
                  <TabsTrigger value="phone">Phone Number</TabsTrigger>
                ) : null}
                {availableIdentifierTabs.includes("username") ? (
                  <TabsTrigger value="username">Username</TabsTrigger>
                ) : null}
              </TabsList>
            )}

            {availableIdentifierTabs.includes("email") ? (
              <TabsContent value="email" className="mt-6 space-y-2">
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
                      <Input
                        {...field}
                        id="sign-in-email"
                        type="email"
                        placeholder="m@example.com"
                        aria-invalid={fieldState.invalid}
                        autoCapitalize="none"
                        autoComplete="email"
                        readOnly={fixedIdentifier?.type === "email"}
                        disabled={fixedIdentifier?.type === "email"}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />
                {emailMethodCopy ? (
                  <p className="text-xs text-muted-foreground">
                    Use {emailMethodCopy} for this identifier.
                  </p>
                ) : null}
                {emailOtpMethodEnabled ? (
                  <div className="text-right">
                    {isEmailOtpAvailable ? (
                      <Link
                        href={verifyEmailOtpHref}
                        className="inline-block text-xs underline text-foreground"
                      >
                        Verify email with a verification code
                      </Link>
                    ) : (
                      <span className="inline-block text-xs text-muted-foreground">
                        Enter a real email to verify via code.
                      </span>
                    )}
                  </div>
                ) : null}
              </TabsContent>
            ) : null}

            {availableIdentifierTabs.includes("phone") ? (
              <TabsContent value="phone" className="mt-6 space-y-2">
                <PhoneNumberWithCountryInput
                  countryIso2={watchedPhoneCountryIso2}
                  phoneNumber={watchedPhoneNumber}
                  onCountryIso2Change={(countryIso2) => {
                    form.setValue("phoneCountryIso2", countryIso2, {
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                    form.clearErrors("phoneCountryIso2");
                  }}
                  onPhoneNumberChange={(phoneNumber) => {
                    form.setValue("phoneNumber", phoneNumber, {
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  countryId="sign-in-phone-country-code"
                  phoneId="sign-in-phone-number"
                  disabled={loading || fixedIdentifier?.type === "phone"}
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
                {phoneMethodCopy ? (
                  <p className="text-xs text-muted-foreground">
                    Use {phoneMethodCopy} for this identifier.
                  </p>
                ) : null}
              </TabsContent>
            ) : null}

            {availableIdentifierTabs.includes("username") ? (
              <TabsContent value="username" className="mt-6 space-y-2">
                <Controller
                  name="username"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="sign-in-username">Username</FieldLabel>
                      <Input
                        {...field}
                        id="sign-in-username"
                        type="text"
                        placeholder="your.username"
                        aria-invalid={fieldState.invalid}
                        autoCapitalize="none"
                        autoComplete="username"
                        readOnly={fixedIdentifier?.type === "username"}
                        disabled={fixedIdentifier?.type === "username"}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Username sign-in uses password only.
                </p>
              </TabsContent>
            ) : null}
          </Tabs>
        ) : null}

        {passwordMethodEnabled ? (
          <>
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
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
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
          </>
        ) : null}
      </FieldGroup>

      {passwordMethodEnabled ? (
        <>
          <Button type="submit" className="w-full relative" disabled={loading}>
            {loading && pendingAction === "password" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Login with password"
            )}
            {isMounted &&
              ((activeIdentifierTab === "email" &&
                authClient.isLastUsedLoginMethod("email")) ||
                (activeIdentifierTab === "phone" &&
                  authClient.isLastUsedLoginMethod("phone-number")) ||
                (activeIdentifierTab === "username" &&
                  authClient.isLastUsedLoginMethod("username"))) && (
                <LastUsedIndicator />
              )}
          </Button>
          <CaptchaActionSlot
            show={isCaptchaVisibleFor("password")}
            captchaRef={captchaRef}
          />
        </>
      ) : null}

      {showEmailMethods && magicLinkMethodEnabled ? (
        <>
          <div className="relative py-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                OR SIGN IN WITH A MAGIC LINK
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
            {isMounted && authClient.isLastUsedLoginMethod("magic-link") ? (
              <LastUsedIndicator />
            ) : null}
          </Button>
          <CaptchaActionSlot
            show={isCaptchaVisibleFor("magic")}
            captchaRef={captchaRef}
          />
        </>
      ) : null}

      {showEmailMethods && emailOtpMethodEnabled ? (
        <>
          <div className="relative py-8">
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
              "Resend email verification code"
            ) : (
              "Email me a verification code"
            )}
            {isMounted && authClient.isLastUsedLoginMethod("email-otp") ? (
              <LastUsedIndicator />
            ) : null}
          </Button>
          <CaptchaActionSlot
            show={isCaptchaVisibleFor("email-otp-send")}
            captchaRef={captchaRef}
          />
          {emailOtpSentTo ? (
            <div className="rounded-md border p-6 space-y-4">
              {!fixedIdentifier ? (
                <p className="text-xs text-muted-foreground">
                  Verification code sent to {emailOtpSentTo}
                </p>
              ) : null}
              <Field>
                <FieldLabel htmlFor="sign-in-email-otp">
                  Email verification code
                </FieldLabel>
                <Input
                  id="sign-in-email-otp"
                  value={emailOtpCode}
                  onChange={(event) =>
                    setEmailOtpCode(event.target.value.replace(/[^\d]/g, ""))
                  }
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter verification code"
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
                  "Sign in with email verification code"
                )}
              </Button>
              <CaptchaActionSlot
                show={isCaptchaVisibleFor("email-otp-verify")}
                captchaRef={captchaRef}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {showPhoneMethods ? (
        <>
          <div className="relative py-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                OR SIGN IN WITH A PHONE VERIFICATION CODE
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
              "Resend phone verification code"
            ) : (
              "Send a verification code to my phone"
            )}
          </Button>
          <CaptchaActionSlot
            show={isCaptchaVisibleFor("phone-otp-send")}
            captchaRef={captchaRef}
          />
          {phoneOtpSentTo ? (
            <div className="rounded-md border p-6 space-y-4">
              {!fixedIdentifier ? (
                <p className="text-xs text-muted-foreground">
                  Verification code sent to {phoneOtpSentTo}
                </p>
              ) : null}
              <Field>
                <FieldLabel htmlFor="sign-in-phone-otp">
                  Phone verification code
                </FieldLabel>
                <Input
                  id="sign-in-phone-otp"
                  value={phoneOtpCode}
                  onChange={(event) =>
                    setPhoneOtpCode(event.target.value.replace(/[^\d]/g, ""))
                  }
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter verification code"
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
                  "Verify code and sign in"
                )}
              </Button>
              <CaptchaActionSlot
                show={isCaptchaVisibleFor("phone-otp-verify")}
                captchaRef={captchaRef}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </form>
  );
}
