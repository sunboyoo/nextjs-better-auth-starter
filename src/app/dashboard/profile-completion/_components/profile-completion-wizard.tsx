"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImageIcon,
  Link2,
  Loader2,
  Lock,
  Mail,
  Phone,
  SkipForward,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot";
import { useCaptchaAction } from "@/components/captcha/use-captcha-action";
import {
  defaultPhoneCountry,
  getE164PhoneNumber,
  PhoneNumberWithCountryInput,
} from "@/components/forms/phone-number-with-country-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import {
  CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
  getCaptchaHeaders,
} from "@/lib/captcha";
import { setPasswordAction } from "../../user-account/_actions/set-password";

type WizardStep = 1 | 2 | 3 | 4;
type InteractiveWizardStep = Exclude<WizardStep, 4>;
type RecoveryMode = "email" | "phone";
type UsernameAvailability =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "error";
type CaptchaAction =
  | "profile-completion-email-link"
  | "profile-completion-email-code-change"
  | "profile-completion-email-code-send"
  | "profile-completion-phone-send"
  | "profile-completion-phone-verify";

type PasswordStrength = "weak" | "fair" | "good" | "strong";
type ProfileCompletionStep = "identity" | "security" | "recovery";

interface ProfileCompletionWizardProps {
  nextUrl: string;
  initialStep: number;
  hasPassword: boolean;
  recoveryMode: RecoveryMode;
  initialUser: {
    name: string;
    username: string | null;
    image: string | null;
    email: string;
    emailVerified: boolean;
    emailSource: string | null;
    phoneNumber: string | null;
    phoneNumberVerified: boolean | null;
  };
  initialProgress: {
    stepIdentityData: Record<string, unknown> | null;
    stepSecurityData: Record<string, unknown> | null;
    stepRecoveryData: Record<string, unknown> | null;
  };
}

interface SaveStepInput {
  step: ProfileCompletionStep;
  skipped?: boolean;
  data?: Record<string, unknown>;
  nextStep?: number;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const PHONE_NUMBER_E164_REGEX = /^\+[1-9]\d{7,14}$/;

const clampWizardStep = (step: number): WizardStep => {
  if (step >= 4) return 4;
  if (step <= 1) return 1;
  if (step === 2) return 2;
  return 3;
};

const readStringFromStepData = (
  data: Record<string, unknown> | null,
  key: string,
  fallback = "",
) => {
  const value = data?.[key];
  return typeof value === "string" ? value : fallback;
};

const validateUsername = (username: string): string | null => {
  if (!username) return "Username is required.";
  if (username.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`;
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return `Username must be at most ${MAX_USERNAME_LENGTH} characters.`;
  }
  if (!USERNAME_REGEX.test(username)) {
    return "Username can only include letters, numbers, underscores, and dots.";
  }
  return null;
};

const getPasswordStrength = (
  password: string,
): { label: PasswordStrength; value: number } => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: "weak", value: 25 };
  if (score === 2) return { label: "fair", value: 50 };
  if (score === 3 || score === 4) return { label: "good", value: 75 };
  return { label: "strong", value: 100 };
};

const getInitialImageUrl = (image: string) => {
  if (!image) return "";
  return image.startsWith("data:") ? "" : image;
};

const getErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
};

export function ProfileCompletionWizard({
  nextUrl,
  initialStep,
  hasPassword: initialHasPassword,
  recoveryMode,
  initialUser,
  initialProgress,
}: ProfileCompletionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(clampWizardStep(initialStep));
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const savedSecurityHasPasswordValue =
    initialProgress.stepSecurityData?.hasPassword;
  const savedSecurityHasPassword =
    typeof savedSecurityHasPasswordValue === "boolean"
      ? savedSecurityHasPasswordValue
      : null;
  const securityStepAlreadyConfirmed =
    initialProgress.stepSecurityData?.hasPassword === true;
  const hasExistingPasswordSignal =
    savedSecurityHasPassword ?? initialHasPassword;
  const [hasPassword, setHasPassword] = useState(
    hasExistingPasswordSignal,
  );
  const [forcePasswordSetup, setForcePasswordSetup] = useState(
    !hasExistingPasswordSignal,
  );
  const [securityStepConfirmed, setSecurityStepConfirmed] = useState(
    securityStepAlreadyConfirmed,
  );
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailability>("idle");
  const [usernameAvailabilityMessage, setUsernameAvailabilityMessage] =
    useState("");

  const [displayName, setDisplayName] = useState(
    readStringFromStepData(
      initialProgress.stepIdentityData,
      "name",
      initialUser.name ?? "",
    ),
  );
  const [username, setUsername] = useState(
    readStringFromStepData(
      initialProgress.stepIdentityData,
      "username",
      initialUser.username ?? "",
    ),
  );
  const initialImage = readStringFromStepData(
    initialProgress.stepIdentityData,
    "image",
    initialUser.image ?? "",
  );
  const [image, setImage] = useState(initialImage);
  const [imageUrl, setImageUrl] = useState(
    getInitialImageUrl(initialImage),
  );
  const [imageInputMode, setImageInputMode] = useState<"url" | "upload">(
    initialImage.startsWith("data:") ? "upload" : "url",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewLoadError, setImagePreviewLoadError] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [recoveryEmail, setRecoveryEmail] = useState(
    readStringFromStepData(
      initialProgress.stepRecoveryData,
      "email",
      initialUser.emailSource === "synthetic" ? "" : initialUser.email,
    ),
  );
  const [recoveryEmailLinkSent, setRecoveryEmailLinkSent] = useState(
    Boolean(initialProgress.stepRecoveryData?.verificationLinkSent),
  );
  const [recoveryEmailOtpCode, setRecoveryEmailOtpCode] = useState("");
  const [recoveryEmailOtpSentTo, setRecoveryEmailOtpSentTo] = useState<
    string | null
  >(
    readStringFromStepData(
      initialProgress.stepRecoveryData,
      "emailCodeSentTo",
      "",
    ) || null,
  );
  const [recoveryEmailVerified, setRecoveryEmailVerified] = useState(
    Boolean(initialProgress.stepRecoveryData?.verified),
  );

  const [phoneCountryIso2, setPhoneCountryIso2] = useState(
    readStringFromStepData(
      initialProgress.stepRecoveryData,
      "countryIso2",
      defaultPhoneCountry?.iso2 ?? "",
    ),
  );
  const [recoveryPhoneNumber, setRecoveryPhoneNumber] = useState(
    readStringFromStepData(initialProgress.stepRecoveryData, "phoneNumber", ""),
  );
  const [recoveryPhoneOtp, setRecoveryPhoneOtp] = useState("");
  const [recoveryPhoneOtpSentTo, setRecoveryPhoneOtpSentTo] = useState<
    string | null
  >(readStringFromStepData(initialProgress.stepRecoveryData, "otpSentTo", ""));
  const [recoveryPhoneVerified, setRecoveryPhoneVerified] = useState(
    Boolean(initialProgress.stepRecoveryData?.verified),
  );
  const stepProgressRef = useRef<HTMLDivElement>(null!);
  const passwordStrengthRef = useRef<HTMLDivElement>(null!);

  const {
    captchaRef,
    runCaptchaForActionOrFail,
    resetCaptcha,
    isCaptchaVisibleFor,
  } = useCaptchaAction<CaptchaAction>();

  const normalizedInitialUsername = (initialUser.username ?? "")
    .trim()
    .toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedDisplayName = displayName.trim();
  const normalizedRecoveryEmail = recoveryEmail.trim().toLowerCase();
  const normalizedImage = image.trim();
  const isCurrentRecoveryEmailVerified =
    recoveryEmailVerified ||
    (initialUser.emailVerified &&
      initialUser.email.trim().toLowerCase() === normalizedRecoveryEmail);
  const recoveryPhoneE164 = getE164PhoneNumber(
    phoneCountryIso2,
    recoveryPhoneNumber,
  );
  const shouldShowSecurityStep = !securityStepConfirmed;
  const hasBothRecoveryChannelsVerified =
    initialUser.emailVerified && Boolean(initialUser.phoneNumberVerified);
  const visibleWizardSteps = useMemo<InteractiveWizardStep[]>(() => {
    const steps: InteractiveWizardStep[] = [1];
    if (shouldShowSecurityStep) {
      steps.push(2);
    }
    if (!hasBothRecoveryChannelsVerified) {
      steps.push(3);
    }
    return steps;
  }, [hasBothRecoveryChannelsVerified, shouldShowSecurityStep]);
  const currentVisibleStepIndex =
    step === 4
      ? Math.max(visibleWizardSteps.length - 1, 0)
      : Math.max(visibleWizardSteps.indexOf(step as InteractiveWizardStep), 0);
  const currentVisibleStepNumber = currentVisibleStepIndex + 1;
  const getNextWizardStep = (currentStep: InteractiveWizardStep): WizardStep => {
    const currentStepIndex = visibleWizardSteps.indexOf(currentStep);
    if (currentStepIndex < 0) {
      return 4;
    }
    return visibleWizardSteps[currentStepIndex + 1] ?? 4;
  };
  const getPreviousWizardStep = (
    currentStep: InteractiveWizardStep,
  ): InteractiveWizardStep | null => {
    const currentStepIndex = visibleWizardSteps.indexOf(currentStep);
    if (currentStepIndex <= 0) {
      return null;
    }
    return visibleWizardSteps[currentStepIndex - 1] ?? null;
  };
  const getPersistedNextStep = (nextStep: WizardStep): number | undefined => {
    if (nextStep === 4) {
      return undefined;
    }
    return nextStep;
  };
  const stepDescription =
    visibleWizardSteps.length === 1
      ? "Complete the remaining setup item."
      : `${visibleWizardSteps.length} setup steps remaining.`;
  const passwordStrength = useMemo(
    () => getPasswordStrength(newPassword),
    [newPassword],
  );
  const shouldCollectPassword = !hasPassword || forcePasswordSetup;

  const progressValue = useMemo(() => {
    if (step === 4) return 100;
    if (visibleWizardSteps.length === 0) return 100;
    return Math.round(
      (currentVisibleStepNumber / visibleWizardSteps.length) * 100,
    );
  }, [currentVisibleStepNumber, step, visibleWizardSteps.length]);

  useEffect(() => {
    setImagePreviewLoadError(false);
  }, [normalizedImage]);

  useEffect(() => {
    if (step === 4) return;
    if (visibleWizardSteps.includes(step as InteractiveWizardStep)) return;
    const fallbackStep =
      visibleWizardSteps.find((visibleStep) => visibleStep > step) ??
      visibleWizardSteps[visibleWizardSteps.length - 1] ??
      1;
    setStep(fallbackStep);
  }, [step, visibleWizardSteps]);

  useEffect(() => {
    if (!normalizedUsername) {
      setUsernameAvailability("idle");
      setUsernameAvailabilityMessage("Choose a unique public username.");
      return;
    }

    const usernameError = validateUsername(normalizedUsername);
    if (usernameError) {
      setUsernameAvailability("error");
      setUsernameAvailabilityMessage(usernameError);
      return;
    }

    if (normalizedUsername === normalizedInitialUsername) {
      setUsernameAvailability("available");
      setUsernameAvailabilityMessage("This is your current username.");
      return;
    }

    let cancelled = false;
    setUsernameAvailability("checking");
    setUsernameAvailabilityMessage("Checking availability...");

    const timer = setTimeout(async () => {
      const { data, error } = await authClient.isUsernameAvailable({
        username: normalizedUsername,
      });

      if (cancelled) return;

      if (error) {
        setUsernameAvailability("error");
        setUsernameAvailabilityMessage(
          error.message || "Unable to check username right now.",
        );
        return;
      }

      if (data?.available) {
        setUsernameAvailability("available");
        setUsernameAvailabilityMessage("Username is available.");
        return;
      }

      setUsernameAvailability("taken");
      setUsernameAvailabilityMessage("That username is already taken.");
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedInitialUsername, normalizedUsername]);

  const runWithLoading = async (
    actionKey: string,
    handler: () => Promise<void>,
  ) => {
    setLoadingAction(actionKey);
    try {
      await handler();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const saveStep = async (input: SaveStepInput) => {
    const response = await fetch("/api/user/profile-completion", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const payload = (await response.json().catch(() => null)) as
      | { status?: boolean; error?: unknown }
      | null;

    if (!response.ok || payload?.status !== true) {
      if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
        throw new Error(payload.error);
      }
      if (Array.isArray(payload?.error)) {
        const firstIssue = payload.error[0] as { message?: string } | undefined;
        if (firstIssue?.message) {
          throw new Error(firstIssue.message);
        }
      }
      throw new Error("Failed to save profile completion step.");
    }
  };

  const finishProfileCompletion = async () => {
    const completionResponse = await fetch("/api/user/profile-completion/complete", {
      method: "POST",
    });
    const completionPayload = (await completionResponse.json().catch(() => null)) as
      | { status?: boolean; error?: string }
      | null;
    if (!completionResponse.ok || completionPayload?.status !== true) {
      throw new Error(completionPayload?.error || "Failed to finish profile setup.");
    }

    setStep(4);
    toast.success("Profile setup complete.");
    setTimeout(() => {
      router.push(nextUrl);
    }, 1400);
  };

  const handleImageFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImage(base64String);
      setImageUrl("");
      setImagePreviewLoadError(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read the image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setImageUrl(url);
    setImage(url);
    setImagePreviewLoadError(false);
  };

  const handleIdentityContinue = async () => {
    await runWithLoading("identity-continue", async () => {
      if (!normalizedDisplayName) {
        toast.error("Display name is required. You can also skip this step.");
        return;
      }

      const usernameError = validateUsername(normalizedUsername);
      if (usernameError) {
        toast.error(usernameError);
        return;
      }

      if (usernameAvailability === "taken") {
        toast.error("Choose a different username.");
        return;
      }

      if (usernameAvailability === "error") {
        toast.error("Please fix the username and try again.");
        return;
      }

      const updates: { name?: string; username?: string; image?: string } = {};
      if (normalizedDisplayName !== initialUser.name) {
        updates.name = normalizedDisplayName;
      }
      if (normalizedUsername !== normalizedInitialUsername) {
        updates.username = normalizedUsername;
      }
      if (normalizedImage !== (initialUser.image ?? "")) {
        updates.image = normalizedImage;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await authClient.updateUser(updates);
        if (error) {
          throw new Error(error.message);
        }
      }

      const nextStep = getNextWizardStep(1);

      await saveStep({
        step: "identity",
        skipped: false,
        data: {
          name: normalizedDisplayName,
          username: normalizedUsername,
          image: normalizedImage || null,
        },
        nextStep: getPersistedNextStep(nextStep),
      });

      if (nextStep === 4) {
        await finishProfileCompletion();
        return;
      }

      toast.success("Identity saved.");
      setStep(nextStep);
      router.refresh();
    });
  };

  const handleIdentitySkip = async () => {
    await runWithLoading("identity-skip", async () => {
      const nextStep = getNextWizardStep(1);

      await saveStep({
        step: "identity",
        skipped: true,
        data: {
          name: normalizedDisplayName || null,
          username: normalizedUsername || null,
          image: normalizedImage || null,
        },
        nextStep: getPersistedNextStep(nextStep),
      });

      if (nextStep === 4) {
        await finishProfileCompletion();
        return;
      }

      toast.success("Step skipped for now.");
      setStep(nextStep);
    });
  };

  const handleSecurityContinue = async () => {
    await runWithLoading("security-continue", async () => {
      if (shouldCollectPassword) {
        if (newPassword.length < 8) {
          toast.error("Password must be at least 8 characters.");
          return;
        }
        if (newPassword !== confirmPassword) {
          toast.error("Passwords do not match.");
          return;
        }

        const result = await setPasswordAction(newPassword);
        if (!result.success) {
          throw new Error(result.error || "Failed to set password.");
        }

        setHasPassword(true);
        setForcePasswordSetup(false);
      }

      const nextStep = getNextWizardStep(2);

      await saveStep({
        step: "security",
        skipped: false,
        data: {
          hasPassword: true,
        },
        nextStep: getPersistedNextStep(nextStep),
      });
      setSecurityStepConfirmed(true);

      if (nextStep === 4) {
        await finishProfileCompletion();
        return;
      }

      toast.success("Security step saved.");
      setStep(nextStep);
      setNewPassword("");
      setConfirmPassword("");
    });
  };

  const handleSecuritySkip = async () => {
    await runWithLoading("security-skip", async () => {
      const nextStep = getNextWizardStep(2);

      await saveStep({
        step: "security",
        skipped: true,
        data: {
          hasPassword,
        },
        nextStep: getPersistedNextStep(nextStep),
      });

      if (nextStep === 4) {
        await finishProfileCompletion();
        return;
      }

      toast.success("Step skipped for now.");
      setStep(nextStep);
    });
  };

  const handleSendRecoveryEmailLink = async () => {
    await runWithLoading("recovery-email-send", async () => {
      if (!normalizedRecoveryEmail || !normalizedRecoveryEmail.includes("@")) {
        toast.error("Enter a valid recovery email.");
        return;
      }

      const captchaToken = await runCaptchaForActionOrFail(
        "profile-completion-email-link",
        () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        },
      );
      if (captchaToken === undefined) return;

      const callbackURL = `/dashboard/profile-completion?next=${encodeURIComponent(nextUrl)}`;
      const { error } = await authClient.changeEmail({
        newEmail: normalizedRecoveryEmail,
        callbackURL,
        fetchOptions: {
          headers: getCaptchaHeaders(captchaToken),
        },
      });
      if (error) {
        throw new Error(error.message);
      }

      setRecoveryEmailLinkSent(true);

      await saveStep({
        step: "recovery",
        skipped: false,
        data: {
          channel: "email",
          email: normalizedRecoveryEmail,
          verificationLinkSent: true,
          emailCodeSentTo: recoveryEmailOtpSentTo,
          verified: isCurrentRecoveryEmailVerified,
        },
        nextStep: 3,
      });

      toast.success("Verification email sent.");
    }).finally(() => {
      resetCaptcha();
    });
  };

  const handleSendRecoveryEmailOtp = async () => {
    await runWithLoading("recovery-email-code-send", async () => {
      if (!normalizedRecoveryEmail || !normalizedRecoveryEmail.includes("@")) {
        toast.error("Enter a valid recovery email.");
        return;
      }

      const captchaToken = await runCaptchaForActionOrFail(
        "profile-completion-email-code-change",
        () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        },
      );
      if (captchaToken === undefined) return;

      const callbackURL = `/dashboard/profile-completion?next=${encodeURIComponent(nextUrl)}`;
      const { error: changeEmailError } = await authClient.changeEmail({
        newEmail: normalizedRecoveryEmail,
        callbackURL,
        fetchOptions: {
          headers: getCaptchaHeaders(captchaToken),
        },
      });
      const changeEmailMessage = changeEmailError?.message?.toLowerCase() ?? "";
      if (
        changeEmailError &&
        !changeEmailMessage.includes("email is the same")
      ) {
        throw new Error(changeEmailError.message || "Failed to prepare email change.");
      }

      const sendOtpCaptchaToken = await runCaptchaForActionOrFail(
        "profile-completion-email-code-send",
        () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        },
      );
      if (sendOtpCaptchaToken === undefined) return;

      const { error } = await authClient.emailOtp.sendVerificationOtp(
        {
          email: normalizedRecoveryEmail,
          type: "email-verification",
        },
        {
          headers: getCaptchaHeaders(sendOtpCaptchaToken),
        },
      );
      if (error) {
        throw new Error(error.message);
      }

      setRecoveryEmailOtpSentTo(normalizedRecoveryEmail);
      setRecoveryEmailOtpCode("");
      setRecoveryEmailVerified(false);

      await saveStep({
        step: "recovery",
        skipped: false,
        data: {
          channel: "email",
          email: normalizedRecoveryEmail,
          verificationLinkSent: recoveryEmailLinkSent,
          emailCodeSentTo: normalizedRecoveryEmail,
          verified: false,
        },
        nextStep: 3,
      });

      toast.success("Verification code sent to your email.");
    }).finally(() => {
      resetCaptcha();
    });
  };

  const handleVerifyRecoveryEmailOtp = async () => {
    await runWithLoading("recovery-email-code-verify", async () => {
      if (!recoveryEmailOtpSentTo) {
        toast.error("Send a verification code first.");
        return;
      }
      if (
        !recoveryEmailOtpCode.trim() ||
        !/^\d+$/.test(recoveryEmailOtpCode.trim())
      ) {
        toast.error("Enter a valid verification code.");
        return;
      }

      const { error } = await authClient.emailOtp.verifyEmail({
        email: recoveryEmailOtpSentTo,
        otp: recoveryEmailOtpCode.trim(),
      });
      if (error) {
        throw new Error(error.message);
      }

      setRecoveryEmailVerified(true);

      await saveStep({
        step: "recovery",
        skipped: false,
        data: {
          channel: "email",
          email: normalizedRecoveryEmail,
          verificationLinkSent: recoveryEmailLinkSent,
          emailCodeSentTo: recoveryEmailOtpSentTo,
          verified: true,
        },
        nextStep: 3,
      });

      toast.success("Recovery email verified.");
      router.refresh();
    });
  };

  const handleSendRecoveryPhoneOtp = async () => {
    await runWithLoading("recovery-phone-send", async () => {
      if (!recoveryPhoneE164 || !PHONE_NUMBER_E164_REGEX.test(recoveryPhoneE164)) {
        toast.error("Enter a valid phone number for the selected country.");
        return;
      }

      const captchaToken = await runCaptchaForActionOrFail(
        "profile-completion-phone-send",
        () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        },
      );
      if (captchaToken === undefined) return;

      const { error } = await authClient.phoneNumber.sendOtp(
        {
          phoneNumber: recoveryPhoneE164,
        },
        {
          headers: getCaptchaHeaders(captchaToken),
        },
      );
      if (error) {
        throw new Error(error.message);
      }

      setRecoveryPhoneOtpSentTo(recoveryPhoneE164);
      setRecoveryPhoneOtp("");
      setRecoveryPhoneVerified(false);

      await saveStep({
        step: "recovery",
        skipped: false,
        data: {
          channel: "phone",
          countryIso2: phoneCountryIso2,
          phoneNumber: recoveryPhoneNumber,
          otpSentTo: recoveryPhoneE164,
          verified: false,
        },
        nextStep: 3,
      });

      toast.success("Verification code sent to your phone.");
    }).finally(() => {
      resetCaptcha();
    });
  };

  const handleVerifyRecoveryPhoneOtp = async () => {
    await runWithLoading("recovery-phone-verify", async () => {
      if (!recoveryPhoneOtpSentTo) {
        toast.error("Send a verification code first.");
        return;
      }
      if (!recoveryPhoneOtp.trim() || !/^\d+$/.test(recoveryPhoneOtp.trim())) {
        toast.error("Enter a valid verification code.");
        return;
      }

      const captchaToken = await runCaptchaForActionOrFail(
        "profile-completion-phone-verify",
        () => {
          toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
        },
      );
      if (captchaToken === undefined) return;

      const { error } = await authClient.phoneNumber.verify(
        {
          phoneNumber: recoveryPhoneOtpSentTo,
          code: recoveryPhoneOtp.trim(),
          updatePhoneNumber: true,
        },
        {
          headers: getCaptchaHeaders(captchaToken),
        },
      );
      if (error) {
        throw new Error(error.message);
      }

      setRecoveryPhoneVerified(true);

      await saveStep({
        step: "recovery",
        skipped: false,
        data: {
          channel: "phone",
          countryIso2: phoneCountryIso2,
          phoneNumber: recoveryPhoneNumber,
          otpSentTo: recoveryPhoneOtpSentTo,
          verified: true,
        },
        nextStep: 3,
      });

      toast.success("Phone verified.");
      router.refresh();
    }).finally(() => {
      resetCaptcha();
    });
  };

  const handleComplete = async (skipRecovery: boolean) => {
    await runWithLoading("complete-profile", async () => {
      const recoveryData =
        recoveryMode === "email"
          ? {
              channel: "email",
              email: normalizedRecoveryEmail || null,
              verificationLinkSent: recoveryEmailLinkSent,
              emailCodeSentTo: recoveryEmailOtpSentTo,
              verified: isCurrentRecoveryEmailVerified,
            }
          : {
              channel: "phone",
              countryIso2: phoneCountryIso2,
              phoneNumber: recoveryPhoneNumber || null,
              otpSentTo: recoveryPhoneOtpSentTo,
              verified: recoveryPhoneVerified,
            };

      await saveStep({
        step: "recovery",
        skipped: skipRecovery,
        data: recoveryData,
        nextStep: getPersistedNextStep(4),
      });

      await finishProfileCompletion();
    });
  };

  const previousSecurityStep = getPreviousWizardStep(2);
  const previousRecoveryStep = getPreviousWizardStep(3);
  const getStepBadgeVariant = (targetStep: InteractiveWizardStep) => {
    if (step === 4) {
      return "default";
    }
    const targetStepIndex = visibleWizardSteps.indexOf(targetStep);
    return targetStepIndex <= currentVisibleStepIndex ? "default" : "secondary";
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>
                {stepDescription}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {step === 4
                ? "All set"
                : `Step ${currentVisibleStepNumber} of ${visibleWizardSteps.length}`}
            </Badge>
          </div>
          <Progress ref={stepProgressRef} value={progressValue} />
          <div
            className="grid gap-2 text-xs"
            style={{
              gridTemplateColumns: `repeat(${visibleWizardSteps.length}, minmax(0, 1fr))`,
            }}
          >
            <Badge variant={getStepBadgeVariant(1)}>
              <UserRound className="mr-1 h-3.5 w-3.5" />
              Identity
            </Badge>
            {visibleWizardSteps.includes(2) ? (
              <Badge variant={getStepBadgeVariant(2)}>
                <Lock className="mr-1 h-3.5 w-3.5" />
                Security
              </Badge>
            ) : null}
            {visibleWizardSteps.includes(3) ? (
              <Badge variant={getStepBadgeVariant(3)}>
                {recoveryMode === "email" ? (
                  <Mail className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <Phone className="mr-1 h-3.5 w-3.5" />
                )}
                Recovery
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Your Public Identity</h2>
                <p className="text-sm text-muted-foreground">
                  Personalize your account with a display name, username, and
                  avatar image.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="pc-name">
                  Display name
                </label>
                <Input
                  id="pc-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Jane Doe"
                  disabled={Boolean(loadingAction)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="pc-username">
                  Username
                </label>
                <Input
                  id="pc-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="jane_doe"
                  autoCapitalize="none"
                  disabled={Boolean(loadingAction)}
                />
                <p
                  className={`text-xs ${
                    usernameAvailability === "taken" ||
                    usernameAvailability === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {usernameAvailabilityMessage}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Profile image</label>
                <Tabs
                  value={imageInputMode}
                  onValueChange={(value) =>
                    setImageInputMode(value as "url" | "upload")
                  }
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="upload"
                      disabled={Boolean(loadingAction)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload image
                    </TabsTrigger>
                    <TabsTrigger value="url" disabled={Boolean(loadingAction)}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Paste URL
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-3 space-y-2">
                    <label className="text-sm font-medium" htmlFor="pc-image-upload">
                      Upload Image (max 2MB)
                    </label>
                    <Input
                      key="pc-image-upload"
                      ref={fileInputRef}
                      id="pc-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      disabled={Boolean(loadingAction)}
                      className="cursor-pointer"
                    />
                  </TabsContent>

                  <TabsContent value="url" className="mt-3 space-y-2">
                    <label className="text-sm font-medium" htmlFor="pc-image-url">
                      Image URL
                    </label>
                    <Input
                      key="pc-image-url"
                      id="pc-image-url"
                      type="url"
                      value={imageUrl}
                      onChange={handleImageUrlChange}
                      placeholder="https://example.com/avatar.jpg"
                      disabled={Boolean(loadingAction)}
                    />
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Portrait preview
                  </p>
                  <div className="mx-auto w-48 max-w-full aspect-square rounded-md border bg-muted/30 p-3">
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                      <div className="h-20 w-20 overflow-hidden rounded-full border bg-background">
                        {normalizedImage && !imagePreviewLoadError ? (
                          // Remote URLs are user-provided and not on a fixed allowlist.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={normalizedImage}
                            alt="Profile image preview"
                            className="h-full w-full object-cover"
                            onError={() => setImagePreviewLoadError(true)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload a local image or paste URL.
                      </p>
                    </div>
                  </div>
                  {normalizedImage && imagePreviewLoadError ? (
                    <p className="mt-2 text-xs text-destructive">
                      This image URL could not be loaded.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleIdentitySkip}
                  disabled={Boolean(loadingAction)}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip for now
                </Button>
                <Button
                  type="button"
                  onClick={handleIdentityContinue}
                  disabled={Boolean(loadingAction)}
                >
                  {loadingAction === "identity-continue" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && visibleWizardSteps.includes(2) && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Set a Backup Password</h2>
                <p className="text-sm text-muted-foreground">
                  Optional, but recommended for account recovery and device
                  sign-ins.
                </p>
              </div>

              {shouldCollectPassword ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="pc-password">
                      Password
                    </label>
                    <PasswordInput
                      id="pc-password"
                      value={newPassword}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setNewPassword(event.target.value)
                      }
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      disabled={Boolean(loadingAction)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="pc-password-confirm"
                    >
                      Confirm password
                    </label>
                    <PasswordInput
                      id="pc-password-confirm"
                      value={confirmPassword}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      disabled={Boolean(loadingAction)}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Strength</span>
                      <span className="font-medium uppercase">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <Progress
                      ref={passwordStrengthRef}
                      value={passwordStrength.value}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700">
                  <p>This account appears to already have a password configured.</p>
                  <p className="text-xs">
                    If you are unsure, you can set a new password now.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setForcePasswordSetup(true)}
                    disabled={Boolean(loadingAction)}
                  >
                    Set or reset password now
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (previousSecurityStep) {
                      setStep(previousSecurityStep);
                    }
                  }}
                  disabled={Boolean(loadingAction) || !previousSecurityStep}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go back
                </Button>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSecuritySkip}
                    disabled={Boolean(loadingAction)}
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip for now
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSecurityContinue}
                    disabled={Boolean(loadingAction)}
                  >
                    {loadingAction === "security-continue" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && visibleWizardSteps.includes(3) && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">
                  {recoveryMode === "email"
                    ? "Add Recovery Email"
                    : "Add Recovery Phone"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {recoveryMode === "email"
                    ? "Add a deliverable email so you can recover your account if phone access is lost."
                    : "Add a phone number for stronger account recovery."}
                </p>
              </div>

              {recoveryMode === "email" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="pc-recovery-email">
                      Recovery email
                    </label>
                    <Input
                      id="pc-recovery-email"
                      type="email"
                      value={recoveryEmail}
                      onChange={(event) => {
                        setRecoveryEmail(event.target.value);
                        setRecoveryEmailLinkSent(false);
                        setRecoveryEmailOtpSentTo(null);
                        setRecoveryEmailOtpCode("");
                        setRecoveryEmailVerified(false);
                      }}
                      placeholder="jane@example.com"
                      autoComplete="email"
                      disabled={Boolean(loadingAction)}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendRecoveryEmailLink}
                      disabled={Boolean(loadingAction)}
                    >
                      {loadingAction === "recovery-email-send" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {recoveryEmailLinkSent
                        ? "Resend verification link"
                        : "Email me a verification link"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendRecoveryEmailOtp}
                      disabled={Boolean(loadingAction)}
                    >
                      {loadingAction === "recovery-email-code-send" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {recoveryEmailOtpSentTo
                        ? "Resend verification code"
                        : "Email me a verification code"}
                    </Button>
                  </div>

                  {recoveryEmailOtpSentTo ? (
                    <div className="space-y-3 rounded-md border p-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="pc-recovery-email-otp">
                          Verification code
                        </label>
                        <Input
                          id="pc-recovery-email-otp"
                          value={recoveryEmailOtpCode}
                          onChange={(event) =>
                            setRecoveryEmailOtpCode(
                              event.target.value.replace(/[^\d]/g, ""),
                            )
                          }
                          placeholder="Enter verification code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          disabled={Boolean(loadingAction)}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleVerifyRecoveryEmailOtp}
                        disabled={Boolean(loadingAction)}
                      >
                        {loadingAction === "recovery-email-code-verify" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Verify email code
                      </Button>
                    </div>
                  ) : null}

                  {recoveryEmailLinkSent && (
                    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700">
                      Verification link sent. Complete verification from your
                      inbox, then return here to finish setup.
                    </div>
                  )}

                  {isCurrentRecoveryEmailVerified ? (
                    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700">
                      Recovery email verified.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <PhoneNumberWithCountryInput
                    countryIso2={phoneCountryIso2}
                    phoneNumber={recoveryPhoneNumber}
                    onCountryIso2Change={setPhoneCountryIso2}
                    onPhoneNumberChange={setRecoveryPhoneNumber}
                    countryId="pc-recovery-phone-country"
                    phoneId="pc-recovery-phone-number"
                    disabled={Boolean(loadingAction)}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendRecoveryPhoneOtp}
                    disabled={Boolean(loadingAction)}
                  >
                    {loadingAction === "recovery-phone-send" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {recoveryPhoneOtpSentTo
                      ? "Resend a verification code to my phone"
                      : "Send a verification code to my phone"}
                  </Button>

                  {recoveryPhoneOtpSentTo ? (
                    <div className="space-y-3 rounded-md border p-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="pc-recovery-phone-otp">
                          Verification code
                        </label>
                        <Input
                          id="pc-recovery-phone-otp"
                          value={recoveryPhoneOtp}
                          onChange={(event) =>
                            setRecoveryPhoneOtp(
                              event.target.value.replace(/[^\d]/g, ""),
                            )
                          }
                          placeholder="Enter verification code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          disabled={Boolean(loadingAction)}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleVerifyRecoveryPhoneOtp}
                        disabled={Boolean(loadingAction)}
                      >
                        {loadingAction === "recovery-phone-verify" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Verify phone
                      </Button>
                    </div>
                  ) : null}

                  {recoveryPhoneVerified ? (
                    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700">
                      Recovery phone verified.
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (previousRecoveryStep) {
                      setStep(previousRecoveryStep);
                    }
                  }}
                  disabled={Boolean(loadingAction) || !previousRecoveryStep}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go back
                </Button>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleComplete(true)}
                    disabled={Boolean(loadingAction)}
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip for now
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleComplete(false)}
                    disabled={Boolean(loadingAction)}
                  >
                    {loadingAction === "complete-profile" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Finish setup
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="text-lg font-semibold">You&apos;re all set</h2>
              <p className="text-sm text-muted-foreground">
                Redirecting you to your dashboard...
              </p>
            </div>
          )}

          <CaptchaActionSlot
            show={
              isCaptchaVisibleFor("profile-completion-email-link") ||
              isCaptchaVisibleFor("profile-completion-email-code-change") ||
              isCaptchaVisibleFor("profile-completion-email-code-send") ||
              isCaptchaVisibleFor("profile-completion-phone-send") ||
              isCaptchaVisibleFor("profile-completion-phone-verify")
            }
            captchaRef={captchaRef}
          />
        </CardContent>
      </Card>
    </div>
  );
}
