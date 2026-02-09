import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  type EmailSource,
  getAuthChannelMetadata,
  isSyntheticEmail,
  normalizeEmail,
  normalizeSyntheticEmailDomain,
} from "@/lib/auth-channel";
import { ac } from "@/lib/built-in-organization-role-permissions";
import { ORGANIZATION_INVITATION_EXPIRES_IN_DAYS } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { electron } from "@/lib/better-auth-electron/server";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import { scim } from "@better-auth/scim";
import { sso } from "@better-auth/sso";
import { stripe } from "@better-auth/stripe";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import type { Organization } from "better-auth/plugins";
import {
  admin,
  bearer,
  captcha,
  customSession,
  deviceAuthorization,
  emailOTP,
  jwt,
  lastLoginMethod,
  magicLink,
  multiSession,
  oAuthProxy,
  oneTap,
  openAPI,
  organization,
  phoneNumber,
  twoFactor,
  username,
} from "better-auth/plugins";
import { Stripe } from "stripe";

const isProduction = process.env.NODE_ENV === "production";
const baseUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const trustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const rateLimitEnabled = process.env.BETTER_AUTH_RATE_LIMIT_ENABLED
  ? process.env.BETTER_AUTH_RATE_LIMIT_ENABLED === "true"
  : isProduction;
const rateLimitWindowRaw = Number.parseInt(
  process.env.BETTER_AUTH_RATE_LIMIT_WINDOW ?? "",
  10,
);
const rateLimitMaxRaw = Number.parseInt(
  process.env.BETTER_AUTH_RATE_LIMIT_MAX ?? "",
  10,
);
const rateLimitWindow = Number.isNaN(rateLimitWindowRaw)
  ? 10
  : Math.max(1, rateLimitWindowRaw);
const rateLimitMax = Number.isNaN(rateLimitMaxRaw)
  ? 100
  : Math.max(1, rateLimitMaxRaw);
const rateLimitStorage =
  process.env.BETTER_AUTH_RATE_LIMIT_STORAGE === "memory" ||
  process.env.BETTER_AUTH_RATE_LIMIT_STORAGE === "database" ||
  process.env.BETTER_AUTH_RATE_LIMIT_STORAGE === "secondary-storage"
    ? process.env.BETTER_AUTH_RATE_LIMIT_STORAGE
    : undefined;
const magicLinkExpiresInRaw = Number.parseInt(
  process.env.BETTER_AUTH_MAGIC_LINK_EXPIRES_IN ?? "",
  10,
);
const magicLinkExpiresIn = Number.isNaN(magicLinkExpiresInRaw)
  ? 5 * 60
  : Math.max(60, magicLinkExpiresInRaw);
const magicLinkDisableSignUp =
  process.env.BETTER_AUTH_MAGIC_LINK_DISABLE_SIGN_UP === "true";
const emailOtpExpiresInRaw = Number.parseInt(
  process.env.BETTER_AUTH_EMAIL_OTP_EXPIRES_IN ?? "",
  10,
);
const emailOtpExpiresIn = Number.isNaN(emailOtpExpiresInRaw)
  ? 5 * 60
  : Math.max(60, emailOtpExpiresInRaw);
const emailOtpLengthRaw = Number.parseInt(
  process.env.BETTER_AUTH_EMAIL_OTP_LENGTH ?? "",
  10,
);
const emailOtpLength = Number.isNaN(emailOtpLengthRaw)
  ? 6
  : Math.max(4, emailOtpLengthRaw);
const emailOtpAllowedAttemptsRaw = Number.parseInt(
  process.env.BETTER_AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS ?? "",
  10,
);
const emailOtpAllowedAttempts = Number.isNaN(emailOtpAllowedAttemptsRaw)
  ? 3
  : Math.max(1, emailOtpAllowedAttemptsRaw);
const emailOtpDisableSignUp =
  process.env.BETTER_AUTH_EMAIL_OTP_DISABLE_SIGN_UP === "true";
const emailOtpSendVerificationOnSignUp =
  process.env.BETTER_AUTH_EMAIL_OTP_SEND_VERIFICATION_ON_SIGN_UP === "true";
const phoneOtpExpiresInRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_EXPIRES_IN ?? "",
  10,
);
const phoneOtpExpiresIn = Number.isNaN(phoneOtpExpiresInRaw)
  ? 5 * 60
  : Math.max(60, phoneOtpExpiresInRaw);
const phoneOtpLengthRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_LENGTH ?? "",
  10,
);
const phoneOtpLength = Number.isNaN(phoneOtpLengthRaw)
  ? 6
  : Math.max(4, phoneOtpLengthRaw);
const phoneOtpAllowedAttemptsRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_ALLOWED_ATTEMPTS ?? "",
  10,
);
const phoneOtpAllowedAttempts = Number.isNaN(phoneOtpAllowedAttemptsRaw)
  ? 3
  : Math.max(1, phoneOtpAllowedAttemptsRaw);
const phoneRequireVerification =
  process.env.BETTER_AUTH_PHONE_REQUIRE_VERIFICATION !== "false";
const phoneSignUpOnVerification =
  process.env.BETTER_AUTH_PHONE_SIGN_UP_ON_VERIFICATION !== "false";
const phoneTempEmailDomain =
  normalizeSyntheticEmailDomain(process.env.BETTER_AUTH_PHONE_TEMP_EMAIL_DOMAIN);
const phoneOtpWebhookUrl =
  process.env.BETTER_AUTH_PHONE_OTP_WEBHOOK_URL?.trim() || "";
const phoneOtpWebhookAuthToken =
  process.env.BETTER_AUTH_PHONE_OTP_WEBHOOK_AUTH_TOKEN?.trim() || "";
type PhoneOtpServiceMode = "twilio-live" | "twilio-test-fixed-otp";
const phoneOtpServiceModeRaw =
  process.env.BETTER_AUTH_PHONE_OTP_SERVICE_MODE?.trim().toLowerCase() || "";
const phoneOtpServiceMode: PhoneOtpServiceMode =
  phoneOtpServiceModeRaw === "twilio-test-fixed-otp"
    ? "twilio-test-fixed-otp"
    : "twilio-live";
const phoneOtpFixedTestCodeRaw =
  process.env.BETTER_AUTH_PHONE_OTP_FIXED_TEST_CODE?.trim() || "000000";
const phoneOtpFixedTestCode = /^\d{4,10}$/.test(phoneOtpFixedTestCodeRaw)
  ? phoneOtpFixedTestCodeRaw
  : "000000";
const phoneOtpUseFixedCodeVerification =
  phoneOtpServiceMode === "twilio-test-fixed-otp";
if (phoneOtpUseFixedCodeVerification) {
  console.warn(
    "[better-auth] phone OTP fixed-test-code verification is enabled. Use only in test environments.",
  );
}
const phoneOtpThrottleEnabled =
  process.env.BETTER_AUTH_PHONE_OTP_THROTTLE_ENABLED !== "false";
const phoneOtpThrottleWindowSecondsRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_THROTTLE_WINDOW_SECONDS ?? "",
  10,
);
const phoneOtpThrottleWindowSeconds = Number.isNaN(
  phoneOtpThrottleWindowSecondsRaw,
)
  ? 10 * 60
  : Math.max(30, phoneOtpThrottleWindowSecondsRaw);
const phoneOtpSendMaxPerIpRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_SEND_MAX_PER_IP ?? "",
  10,
);
const phoneOtpSendMaxPerIp = Number.isNaN(phoneOtpSendMaxPerIpRaw)
  ? 20
  : Math.max(1, phoneOtpSendMaxPerIpRaw);
const phoneOtpSendMaxPerPhoneRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_SEND_MAX_PER_PHONE ?? "",
  10,
);
const phoneOtpSendMaxPerPhone = Number.isNaN(phoneOtpSendMaxPerPhoneRaw)
  ? 6
  : Math.max(1, phoneOtpSendMaxPerPhoneRaw);
const phoneOtpVerifyMaxPerIpRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_VERIFY_MAX_PER_IP ?? "",
  10,
);
const phoneOtpVerifyMaxPerIp = Number.isNaN(phoneOtpVerifyMaxPerIpRaw)
  ? 40
  : Math.max(1, phoneOtpVerifyMaxPerIpRaw);
const phoneOtpVerifyMaxPerPhoneRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_VERIFY_MAX_PER_PHONE ?? "",
  10,
);
const phoneOtpVerifyMaxPerPhone = Number.isNaN(phoneOtpVerifyMaxPerPhoneRaw)
  ? 12
  : Math.max(1, phoneOtpVerifyMaxPerPhoneRaw);
const phoneOtpResetRequestMaxPerIpRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_RESET_REQUEST_MAX_PER_IP ?? "",
  10,
);
const phoneOtpResetRequestMaxPerIp = Number.isNaN(
  phoneOtpResetRequestMaxPerIpRaw,
)
  ? 12
  : Math.max(1, phoneOtpResetRequestMaxPerIpRaw);
const phoneOtpResetRequestMaxPerPhoneRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_RESET_REQUEST_MAX_PER_PHONE ?? "",
  10,
);
const phoneOtpResetRequestMaxPerPhone = Number.isNaN(
  phoneOtpResetRequestMaxPerPhoneRaw,
)
  ? 6
  : Math.max(1, phoneOtpResetRequestMaxPerPhoneRaw);
const phoneOtpResetVerifyMaxPerIpRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_RESET_VERIFY_MAX_PER_IP ?? "",
  10,
);
const phoneOtpResetVerifyMaxPerIp = Number.isNaN(
  phoneOtpResetVerifyMaxPerIpRaw,
)
  ? 30
  : Math.max(1, phoneOtpResetVerifyMaxPerIpRaw);
const phoneOtpResetVerifyMaxPerPhoneRaw = Number.parseInt(
  process.env.BETTER_AUTH_PHONE_OTP_RESET_VERIFY_MAX_PER_PHONE ?? "",
  10,
);
const phoneOtpResetVerifyMaxPerPhone = Number.isNaN(
  phoneOtpResetVerifyMaxPerPhoneRaw,
)
  ? 10
  : Math.max(1, phoneOtpResetVerifyMaxPerPhoneRaw);
const oneTapDisableSignup =
  process.env.BETTER_AUTH_ONE_TAP_DISABLE_SIGN_UP === "true";
const oneTapServerClientId =
  process.env.BETTER_AUTH_ONE_TAP_CLIENT_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID;
type CaptchaProvider =
  | "cloudflare-turnstile"
  | "google-recaptcha"
  | "hcaptcha"
  | "captchafox";
const captchaEnabled = process.env.BETTER_AUTH_CAPTCHA_ENABLED === "true";
const captchaProviderRaw =
  process.env.BETTER_AUTH_CAPTCHA_PROVIDER || "cloudflare-turnstile";
const captchaProvider = (
  [
    "cloudflare-turnstile",
    "google-recaptcha",
    "hcaptcha",
    "captchafox",
  ] as const
).includes(captchaProviderRaw as CaptchaProvider)
  ? (captchaProviderRaw as CaptchaProvider)
  : "cloudflare-turnstile";
const captchaSecretKey = process.env.BETTER_AUTH_CAPTCHA_SECRET_KEY;
const captchaSiteKey =
  process.env.BETTER_AUTH_CAPTCHA_SITE_KEY ||
  process.env.NEXT_PUBLIC_BETTER_AUTH_CAPTCHA_SITE_KEY;
const defaultCaptchaEndpoints = [
  "/sign-up/email",
  "/sign-in/email",
  "/sign-in/phone-number",
  "/sign-in/username",
  "/sign-in/email-otp",
  "/send-verification-email",
  "/request-password-reset",
  "/sign-in/magic-link",
  "/email-otp/send-verification-otp",
  "/email-otp/request-password-reset",
  "/phone-number/send-otp",
  "/phone-number/verify",
  "/phone-number/request-password-reset",
  "/phone-number/reset-password",
  "/change-email",
  "/delete-user",
];
const captchaExtraEndpoints = (
  process.env.BETTER_AUTH_CAPTCHA_EXTRA_ENDPOINTS ?? ""
)
  .split(",")
  .map((endpoint) => endpoint.trim())
  .filter(Boolean);
const captchaEndpoints = Array.from(
  new Set([...defaultCaptchaEndpoints, ...captchaExtraEndpoints]),
);
const captchaMinScoreRaw = Number.parseFloat(
  process.env.BETTER_AUTH_CAPTCHA_MIN_SCORE ?? "",
);
const captchaMinScore = Number.isNaN(captchaMinScoreRaw)
  ? undefined
  : Math.max(0, Math.min(1, captchaMinScoreRaw));
const captchaPlugin = (() => {
  if (!captchaEnabled || !captchaSecretKey) {
    return null;
  }

  const baseOptions = {
    secretKey: captchaSecretKey,
    endpoints: captchaEndpoints,
  };

  if (captchaProvider === "google-recaptcha") {
    return captcha({
      provider: "google-recaptcha",
      ...baseOptions,
      ...(typeof captchaMinScore === "number"
        ? { minScore: captchaMinScore }
        : {}),
    });
  }

  if (captchaProvider === "hcaptcha") {
    return captcha({
      provider: "hcaptcha",
      ...baseOptions,
      ...(captchaSiteKey ? { siteKey: captchaSiteKey } : {}),
    });
  }

  if (captchaProvider === "captchafox") {
    return captcha({
      provider: "captchafox",
      ...baseOptions,
      ...(captchaSiteKey ? { siteKey: captchaSiteKey } : {}),
    });
  }

  return captcha({
    provider: "cloudflare-turnstile",
    ...baseOptions,
  });
})();

const e164PhoneRegex = /^\+[1-9]\d{7,14}$/;

const normalizePhoneNumberForTempEmail = (phoneNumber: string) =>
  phoneNumber.replace(/[^\d]/g, "");

const getTempEmailForPhoneNumber = (phoneNumber: string) => {
  const normalizedPhoneNumber = normalizePhoneNumberForTempEmail(phoneNumber);
  return `phone-${normalizedPhoneNumber}@${phoneTempEmailDomain}`;
};

const isSyntheticEmailAddress = (email: string | null | undefined) =>
  isSyntheticEmail(email, phoneTempEmailDomain);

const syntheticEmailBlockedPaths = new Set([
  "/sign-up/email",
  "/sign-in/email",
  "/sign-in/email-otp",
  "/sign-in/magic-link",
  "/request-password-reset",
  "/send-verification-email",
  "/email-otp/send-verification-otp",
  "/email-otp/request-password-reset",
  "/email-otp/verify-email",
]);

const syntheticEmailFlowErrorMessage =
  "Email-based authentication is unavailable for this phone-first account. Add and verify a real email in account settings.";
const genericCredentialErrorMessage = "Invalid credentials.";
const genericEmailRecoveryMessage =
  "If an account exists for this email and supports email delivery, a message will be sent.";

const extractEmailFromRequestBody = (body: unknown): string | null => {
  if (!body || typeof body !== "object") return null;
  const email = (body as { email?: unknown }).email;
  if (typeof email !== "string") return null;
  const normalized = normalizeEmail(email);
  return normalized || null;
};

const normalizePhoneNumberInput = (value: string) =>
  value.replace(/[()\s-]/g, "");

const extractPhoneNumberFromRequestBody = (body: unknown): string | null => {
  if (!body || typeof body !== "object") return null;
  const phoneNumber = (body as { phoneNumber?: unknown }).phoneNumber;
  if (typeof phoneNumber !== "string") return null;
  const normalized = normalizePhoneNumberInput(phoneNumber.trim());
  return normalized || null;
};

const getClientIpAddress = (headers: Headers): string => {
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const candidate = xForwardedFor.split(",")[0]?.trim();
    if (candidate) return candidate;
  }
  const xRealIp = headers.get("x-real-ip")?.trim();
  if (xRealIp) return xRealIp;
  const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;
  return "unknown";
};

const hashThrottleValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const phoneOtpThrottlePathConfig = {
  "/phone-number/send-otp": {
    maxPerIp: phoneOtpSendMaxPerIp,
    maxPerPhone: phoneOtpSendMaxPerPhone,
  },
  "/phone-number/verify": {
    maxPerIp: phoneOtpVerifyMaxPerIp,
    maxPerPhone: phoneOtpVerifyMaxPerPhone,
  },
  "/phone-number/request-password-reset": {
    maxPerIp: phoneOtpResetRequestMaxPerIp,
    maxPerPhone: phoneOtpResetRequestMaxPerPhone,
  },
  "/phone-number/reset-password": {
    maxPerIp: phoneOtpResetVerifyMaxPerIp,
    maxPerPhone: phoneOtpResetVerifyMaxPerPhone,
  },
} as const;

type OtpThrottleBucket = {
  count: number;
  resetAt: number;
};

type OtpThrottleRule = {
  key: string;
  max: number;
};

const parseOtpThrottleBucket = (value: string | null): OtpThrottleBucket | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<OtpThrottleBucket>;
    if (
      typeof parsed.count !== "number" ||
      Number.isNaN(parsed.count) ||
      typeof parsed.resetAt !== "number" ||
      Number.isNaN(parsed.resetAt)
    ) {
      return null;
    }
    return {
      count: parsed.count,
      resetAt: parsed.resetAt,
    };
  } catch {
    return null;
  }
};

const getOtpThrottleStorage = () => secondaryStorage ?? memorySecondaryStorage;

const enforceOtpThrottleRule = async (
  rule: OtpThrottleRule,
): Promise<number | null> => {
  const storage = getOtpThrottleStorage();
  const now = Date.now();
  const existing = parseOtpThrottleBucket(await storage.get(rule.key));
  const windowMs = phoneOtpThrottleWindowSeconds * 1000;

  if (!existing || existing.resetAt <= now) {
    const next: OtpThrottleBucket = {
      count: 1,
      resetAt: now + windowMs,
    };
    await storage.set(rule.key, JSON.stringify(next), phoneOtpThrottleWindowSeconds);
    return null;
  }

  if (existing.count >= rule.max) {
    return Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  }

  const next: OtpThrottleBucket = {
    count: existing.count + 1,
    resetAt: existing.resetAt,
  };
  const ttlSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  await storage.set(rule.key, JSON.stringify(next), ttlSeconds);
  return null;
};

const enforcePhoneOtpThrottles = async (ctx: {
  path: string;
  headers: Headers;
  body?: unknown;
}) => {
  if (!phoneOtpThrottleEnabled) return;
  if (!(ctx.path in phoneOtpThrottlePathConfig)) return;

  const config =
    phoneOtpThrottlePathConfig[
      ctx.path as keyof typeof phoneOtpThrottlePathConfig
    ];
  const phoneNumber = extractPhoneNumberFromRequestBody(ctx.body);
  if (!phoneNumber) {
    return;
  }

  const ipAddress = getClientIpAddress(ctx.headers);
  const ipHash = hashThrottleValue(ipAddress);
  const phoneHash = hashThrottleValue(phoneNumber);
  const rules: OtpThrottleRule[] = [
    {
      key: `otp-throttle:${ctx.path}:ip:${ipHash}`,
      max: config.maxPerIp,
    },
    {
      key: `otp-throttle:${ctx.path}:phone:${phoneHash}`,
      max: config.maxPerPhone,
    },
  ];

  for (const rule of rules) {
    const retryAfterSeconds = await enforceOtpThrottleRule(rule);
    if (!retryAfterSeconds) continue;

    console.warn("[better-auth][otp-throttle] request blocked", {
      path: ctx.path,
      bucket: rule.key.includes(":ip:") ? "ip" : "phone",
      retryAfterSeconds,
    });
    throw new APIError("TOO_MANY_REQUESTS", {
      message: "Too many OTP attempts. Please wait and try again.",
    });
  }
};

const getSyntheticEmailBlockMessageForPath = (path: string): string => {
  if (
    path === "/sign-in/email" ||
    path === "/sign-in/email-otp" ||
    path === "/sign-in/magic-link" ||
    path === "/sign-in/username"
  ) {
    return genericCredentialErrorMessage;
  }

  if (
    path === "/request-password-reset" ||
    path === "/email-otp/request-password-reset" ||
    path === "/email-otp/send-verification-otp"
  ) {
    return genericEmailRecoveryMessage;
  }

  return syntheticEmailFlowErrorMessage;
};

type AuthChannelUserShape = {
  id?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean | null;
  emailSource?: string | null;
  emailDeliverable?: boolean | null;
};

type AuthChannelMetadataPatch = Partial<{
  email: string;
  emailSource: EmailSource;
  emailDeliverable: boolean;
}>;

const computeAuthChannelMetadataForUser = (user: AuthChannelUserShape) =>
  getAuthChannelMetadata({
    email: user.email ?? null,
    emailVerified: user.emailVerified === true,
    phoneNumber: user.phoneNumber ?? null,
    phoneNumberVerified: user.phoneNumberVerified === true,
    syntheticEmailDomain: phoneTempEmailDomain,
  });

const buildAuthChannelMetadataPatch = (
  user: AuthChannelUserShape,
): AuthChannelMetadataPatch => {
  const metadata = computeAuthChannelMetadataForUser(user);
  const patch: AuthChannelMetadataPatch = {};
  const normalizedEmail = metadata.normalizedEmail ?? null;

  if (
    typeof normalizedEmail === "string" &&
    normalizedEmail !== (user.email ?? null)
  ) {
    patch.email = normalizedEmail;
  }
  if (metadata.emailSource !== (user.emailSource ?? null)) {
    patch.emailSource = metadata.emailSource;
  }
  if (metadata.emailDeliverable !== (user.emailDeliverable ?? null)) {
    patch.emailDeliverable = metadata.emailDeliverable;
  }

  return patch;
};

const persistAuthChannelMetadataPatch = async (
  userId: string,
  patch: AuthChannelMetadataPatch,
) => {
  if (!Object.keys(patch).length) {
    return;
  }
  await db.update(schema.user).set(patch).where(eq(schema.user.id, userId));
};

const syncPersistedUserAuthChannelMetadata = async (userId: string) => {
  const existing = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
      phoneNumber: schema.user.phoneNumber,
      phoneNumberVerified: schema.user.phoneNumberVerified,
      emailSource: schema.user.emailSource,
      emailDeliverable: schema.user.emailDeliverable,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return;
  }

  const patch = buildAuthChannelMetadataPatch(existing);
  await persistAuthChannelMetadataPatch(userId, patch);
};

const sendPhoneOtpMessage = ({
  phoneNumber,
  code,
  type,
}: {
  phoneNumber: string;
  code: string;
  type: "verification" | "password-reset";
}) => {
  if (phoneOtpWebhookUrl) {
    void fetch(phoneOtpWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(phoneOtpWebhookAuthToken
          ? { authorization: `Bearer ${phoneOtpWebhookAuthToken}` }
          : {}),
      },
      body: JSON.stringify({
        phoneNumber,
        code,
        type,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          console.error(
            `[better-auth] phone OTP webhook returned ${response.status}`,
          );
        }
      })
      .catch((error) => {
        console.error("[better-auth] phone OTP webhook request failed", error);
      });
    return;
  }

  if (isProduction) {
    console.warn(
      "[better-auth] Phone OTP requested but BETTER_AUTH_PHONE_OTP_WEBHOOK_URL is not configured.",
    );
    return;
  }

  console.info(`[better-auth] Phone OTP (${type}) for ${phoneNumber}: ${code}`);
};

const enableStripe =
  process.env.BETTER_AUTH_ENABLE_STRIPE !== "false" &&
  Boolean(process.env.STRIPE_KEY) &&
  Boolean(process.env.STRIPE_WEBHOOK_SECRET);
const enableSSO = process.env.BETTER_AUTH_ENABLE_SSO !== "false";
const enableSCIM = process.env.BETTER_AUTH_ENABLE_SCIM !== "false";

type SecondaryStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

const memorySecondaryStorage: SecondaryStorage = (() => {
  const store = new Map<string, { value: string; expiresAt?: number }>();

  return {
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, ttl) {
      const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
      store.set(key, { value, expiresAt });
    },
    async delete(key) {
      store.delete(key);
    },
  };
})();

const secondaryStorage =
  process.env.BETTER_AUTH_SECONDARY_STORAGE === "memory"
    ? memorySecondaryStorage
    : undefined;

const socialProviders = {
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
  ...((process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) &&
  process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          prompt: "select_account" as const,
          clientId:
            process.env.GOOGLE_CLIENT_ID ||
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
    ? {
        facebook: {
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ? {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
    ? {
        microsoft: {
          clientId: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          tenantId: process.env.MICROSOFT_TENANT_ID || "common",
          authority:
            process.env.MICROSOFT_AUTHORITY ||
            "https://login.microsoftonline.com",
          prompt: "select_account" as const,
        },
      }
    : {}),
  ...(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
    ? {
        twitch: {
          clientId: process.env.TWITCH_CLIENT_ID,
          clientSecret: process.env.TWITCH_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
    ? {
        twitter: {
          clientId: process.env.TWITTER_CLIENT_ID,
          clientSecret: process.env.TWITTER_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    ? {
        paypal: {
          clientId: process.env.PAYPAL_CLIENT_ID,
          clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET
    ? {
        vercel: {
          clientId: process.env.VERCEL_CLIENT_ID,
          clientSecret: process.env.VERCEL_CLIENT_SECRET,
        },
      }
    : {}),
};

export const configuredSocialProviderIds = Object.keys(socialProviders);

const authOptions = {
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.user,
    },
  }),
  experimental: {
    joins: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      await enforcePhoneOtpThrottles({
        path: ctx.path,
        headers: ctx.headers ?? new Headers(),
        body: ctx.body,
      });

      if (ctx.path.includes("invitation")) {
        const invitationEmail = extractEmailFromRequestBody(ctx.body);
        if (invitationEmail && isSyntheticEmailAddress(invitationEmail)) {
          throw new APIError("BAD_REQUEST", {
            message:
              "Organization invitations require a real, deliverable email address.",
          });
        }
      }

      if (ctx.path === "/sign-in/username") {
        const rawUsername =
          typeof ctx.body?.username === "string" ? ctx.body.username : "";
        const normalizedUsername = rawUsername.trim().toLowerCase();
        if (normalizedUsername) {
          const user = await ctx.context.adapter.findOne<{
            id: string;
            email: string;
          }>({
            model: "user",
            where: [
              {
                field: "username",
                value: normalizedUsername,
              },
            ],
          });

          if (user && isSyntheticEmailAddress(user.email)) {
            throw new APIError("BAD_REQUEST", {
              message: genericCredentialErrorMessage,
            });
          }
        }
      }

      if (ctx.path === "/delete-user") {
        const activeUserId = ctx.context.session?.session?.userId;
        if (activeUserId) {
          const user = await ctx.context.internalAdapter
            .findUserById(activeUserId)
            .catch(() => null);
          const userEmail =
            user && typeof user.email === "string" ? user.email : null;
          if (isSyntheticEmailAddress(userEmail)) {
            const bodyPassword =
              typeof ctx.body?.password === "string"
                ? ctx.body.password.trim()
                : "";
            if (!bodyPassword) {
              throw new APIError("BAD_REQUEST", {
                message:
                  "Phone-first accounts must confirm deletion with a password. Set a password first, then retry deletion.",
              });
            }
          }
        }
      }

      if (!syntheticEmailBlockedPaths.has(ctx.path)) {
        return;
      }

      const email = extractEmailFromRequestBody(ctx.body);
      if (!email) {
        return;
      }

      if (!isSyntheticEmailAddress(email)) {
        return;
      }

      throw new APIError("BAD_REQUEST", {
        message: getSyntheticEmailBlockMessageForPath(ctx.path),
      });
    }),
  },
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          const metadata = getAuthChannelMetadata({
            email: user.email,
            emailVerified:
              typeof user.emailVerified === "boolean"
                ? user.emailVerified
                : false,
            phoneNumber:
              typeof user.phoneNumber === "string" ? user.phoneNumber : null,
            phoneNumberVerified:
              typeof user.phoneNumberVerified === "boolean"
                ? user.phoneNumberVerified
                : false,
            syntheticEmailDomain: phoneTempEmailDomain,
          });

          return {
            data: {
              ...user,
              ...(metadata.normalizedEmail
                ? { email: metadata.normalizedEmail }
                : {}),
              emailSource: metadata.emailSource,
              emailDeliverable: metadata.emailDeliverable,
            },
          };
        },
      },
      update: {
        async before(user, context) {
          const hasRelevantUpdate =
            typeof user.email === "string" ||
            typeof user.emailVerified === "boolean" ||
            typeof user.phoneNumber === "string" ||
            typeof user.phoneNumberVerified === "boolean";

          if (!hasRelevantUpdate) {
            return;
          }

          const hookContext = context?.context ?? null;
          const userDataWithOptionalId = user as { id?: string };
          const targetUserId =
            typeof userDataWithOptionalId.id === "string"
              ? userDataWithOptionalId.id
              : hookContext?.session?.session?.userId;
          const existingUserByIdRaw =
            typeof targetUserId === "string" && hookContext
              ? await hookContext.internalAdapter
                  .findUserById(targetUserId)
                  .catch(() => null)
              : null;
          const fallbackLookupPhoneNumber =
            typeof user.phoneNumber === "string"
              ? normalizePhoneNumberInput(user.phoneNumber)
              : extractPhoneNumberFromRequestBody(hookContext?.body);
          const existingUserByPhoneRaw =
            !existingUserByIdRaw &&
            hookContext &&
            typeof fallbackLookupPhoneNumber === "string"
              ? await hookContext.adapter
                  .findOne<{
                    id: string;
                    email?: string | null;
                    emailVerified?: boolean | null;
                    phoneNumber?: string | null;
                    phoneNumberVerified?: boolean | null;
                  }>({
                    model: "user",
                    where: [
                      {
                        field: "phoneNumber",
                        value: fallbackLookupPhoneNumber,
                      },
                    ],
                  })
                  .catch(() => null)
              : null;
          const fallbackLookupEmail =
            typeof user.email === "string"
              ? normalizeEmail(user.email)
              : extractEmailFromRequestBody(hookContext?.body);
          const existingUserByEmailRaw =
            !existingUserByIdRaw &&
            !existingUserByPhoneRaw &&
            hookContext &&
            typeof fallbackLookupEmail === "string"
              ? await hookContext.adapter
                  .findOne<{
                    id: string;
                    email?: string | null;
                    emailVerified?: boolean | null;
                    phoneNumber?: string | null;
                    phoneNumberVerified?: boolean | null;
                  }>({
                    model: "user",
                    where: [
                      {
                        field: "email",
                        value: fallbackLookupEmail,
                      },
                    ],
                  })
                  .catch(() => null)
              : null;
          const existingUserRaw =
            existingUserByIdRaw ?? existingUserByPhoneRaw ?? existingUserByEmailRaw;
          const existingUser = existingUserRaw as
            | {
                email?: string | null;
                emailVerified?: boolean | null;
                phoneNumber?: string | null;
                phoneNumberVerified?: boolean | null;
              }
            | null;

          const metadata = getAuthChannelMetadata({
            email:
              typeof user.email === "string"
                ? user.email
                : existingUser?.email || null,
            emailVerified:
              typeof user.emailVerified === "boolean"
                ? user.emailVerified
                : existingUser?.emailVerified || false,
            phoneNumber:
              typeof user.phoneNumber === "string"
                ? user.phoneNumber
                : existingUser?.phoneNumber || null,
            phoneNumberVerified:
              typeof user.phoneNumberVerified === "boolean"
                ? user.phoneNumberVerified
                : existingUser?.phoneNumberVerified || false,
            syntheticEmailDomain: phoneTempEmailDomain,
          });

          return {
            data: {
              ...user,
              ...(typeof user.email === "string" && metadata.normalizedEmail
                ? { email: metadata.normalizedEmail }
                : {}),
              ...(metadata.normalizedEmail
                ? {
                    emailSource: metadata.emailSource,
                    emailDeliverable: metadata.emailDeliverable,
                  }
                : {}),
            },
          };
        },
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: [
        "email-password",
        "facebook",
        "github",
        "google",
        "discord",
        "microsoft",
        "twitch",
        "twitter",
        "paypal",
        "vercel",
      ],
    },
  },
  user: {
    additionalFields: {
      emailSource: {
        type: "string",
        required: false,
        input: false,
      },
      emailDeliverable: {
        type: "boolean",
        required: false,
        input: false,
      },
    },
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        if (isSyntheticEmailAddress(user.email)) {
          console.info(
            "[better-auth] skipping change email confirmation for synthetic email",
          );
          return;
        }
        await sendEmail({
          to: user.email,
          subject: "Confirm your email change",
          text: `We received a request to change your account email to ${newEmail}. Confirm this change by clicking: ${url}`,
        });
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        if (isSyntheticEmailAddress(user.email)) {
          console.info(
            "[better-auth] skipping delete account verification email for synthetic email",
          );
          return;
        }
        await sendEmail({
          to: user.email,
          subject: "Confirm account deletion",
          text: `We received a request to delete your account. If you did not make this request, please ignore this email. To confirm deletion, click: ${url}`,
        });
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    async sendResetPassword({ user, url }) {
      if (isSyntheticEmailAddress(user.email)) {
        console.info(
          "[better-auth] skipping password reset email for synthetic email",
        );
        return;
      }
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (isSyntheticEmailAddress(user.email)) {
        console.info(
          "[better-auth] skipping verification email for synthetic email",
        );
        return;
      }
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    storeSessionInDatabase: true,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  ...(Object.keys(socialProviders).length ? { socialProviders } : {}),
  plugins: [
    nextCookies(),
    ...(captchaPlugin ? [captchaPlugin] : []),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    organization({
      ac,
      dynamicAccessControl: {
        enabled: true,
      },
      invitationExpiresIn:
        ORGANIZATION_INVITATION_EXPIRES_IN_DAYS * 24 * 60 * 60,
      requireEmailVerificationOnInvitation: true,
      async sendInvitationEmail(data) {
        if (isSyntheticEmailAddress(data.email)) {
          throw new APIError("BAD_REQUEST", {
            message:
              "Organization invitations require a real, deliverable email address.",
          });
        }
        const inviteLink = `${baseUrl}/auth/accept-invitation/${data.id}`;
        await sendEmail({
          to: data.email,
          subject: `You've been invited to join ${data.organization.name}`,
          text: `${data.inviter.user.name} (${data.inviter.user.email}) has invited you to join ${data.organization.name}.\n\nClick here to accept the invitation: ${inviteLink}\n\nThis invitation will expire at ${data.invitation.expiresAt.toISOString()}.`,
        });
      },
    }),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          await sendEmail({
            to: user.email,
            subject: "Your two-factor authentication code",
            text: `Your OTP code is: ${otp}`,
          });
        },
      },
    }),
    emailOTP({
      expiresIn: emailOtpExpiresIn,
      otpLength: emailOtpLength,
      allowedAttempts: emailOtpAllowedAttempts,
      disableSignUp: emailOtpDisableSignUp,
      sendVerificationOnSignUp: emailOtpSendVerificationOnSignUp,
      async sendVerificationOTP({ email, otp, type }) {
        if (isSyntheticEmailAddress(email)) {
          console.info(
            `[better-auth] skipping email OTP (${type}) for synthetic email`,
          );
          return;
        }

        if (type === "sign-in") {
          await sendEmail({
            to: email,
            subject: "Your sign-in OTP code",
            text: `Your one-time sign-in code is: ${otp}`,
          });
          return;
        }

        if (type === "email-verification") {
          await sendEmail({
            to: email,
            subject: "Verify your email address",
            text: `Your email verification code is: ${otp}`,
          });
          return;
        }

        await sendEmail({
          to: email,
          subject: "Your password reset OTP code",
          text: `Your password reset code is: ${otp}`,
        });
      },
    }),
    phoneNumber({
      otpLength: phoneOtpLength,
      expiresIn: phoneOtpExpiresIn,
      allowedAttempts: phoneOtpAllowedAttempts,
      requireVerification: phoneRequireVerification,
      ...(phoneOtpUseFixedCodeVerification
        ? {
            verifyOTP: async ({ code }) =>
              code.trim() === phoneOtpFixedTestCode,
          }
        : {}),
      phoneNumberValidator: (phoneNumber) => e164PhoneRegex.test(phoneNumber),
      sendOTP: ({ phoneNumber, code }) => {
        sendPhoneOtpMessage({
          phoneNumber,
          code,
          type: "verification",
        });
      },
      sendPasswordResetOTP: ({ phoneNumber, code }) => {
        sendPhoneOtpMessage({
          phoneNumber,
          code,
          type: "password-reset",
        });
      },
      callbackOnVerification: async ({ user }) => {
        if (!user?.id) {
          return;
        }
        await syncPersistedUserAuthChannelMetadata(user.id);
      },
      ...(phoneSignUpOnVerification
        ? {
            signUpOnVerification: {
              getTempEmail: getTempEmailForPhoneNumber,
              getTempName: (phoneNumber) => phoneNumber,
            },
          }
        : {}),
    }),
    magicLink({
      expiresIn: magicLinkExpiresIn,
      disableSignUp: magicLinkDisableSignUp,
      async sendMagicLink({ email, url }) {
        if (isSyntheticEmailAddress(email)) {
          console.info(
            "[better-auth] skipping magic link for synthetic email",
          );
          return;
        }
        await sendEmail({
          to: email,
          subject: "Your magic sign-in link",
          text: `Click the link to sign in: ${url}`,
        });
      },
    }),
    username(),
    passkey(),
    openAPI(),
    bearer(),
    multiSession(),
    deviceAuthorization({
      expiresIn: "3min",
      interval: "5s",
    }),
    lastLoginMethod({
      customResolveMethod(ctx) {
        if (
          ctx.path === "/magic-link/verify" ||
          ctx.path === "/sign-in/magic-link"
        ) {
          return "magic-link";
        }
        if (ctx.path === "/sign-in/email-otp") {
          return "email-otp";
        }
        if (ctx.path === "/phone-number/verify") {
          return "phone-otp";
        }
        if (ctx.path === "/sign-in/phone-number") {
          return "phone-number";
        }
        return null;
      },
    }),
    oAuthProxy({
      productionURL: baseUrl,
    }),
    oneTap({
      disableSignup: oneTapDisableSignup,
      ...(oneTapServerClientId ? { clientId: oneTapServerClientId } : {}),
    }),
    jwt({
      jwt: {
        issuer: baseUrl,
      },
    }),
    oauthProvider({
      loginPage: "/auth/sign-in",
      consentPage: "/auth/oauth/consent",
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      scopes: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "read:organization",
      ],
      validAudiences: [baseUrl, `${baseUrl}/api/mcp`],
      selectAccount: {
        page: "/auth/oauth/select-account",
        shouldRedirect: async ({ headers }) => {
          const sessions = await getAllDeviceSessions(headers);
          return sessions.length >= 1;
        },
      },
      customAccessTokenClaims({ referenceId, scopes }) {
        if (referenceId && scopes.includes("read:organization")) {
          return {
            [`${baseUrl}/org`]: referenceId,
          };
        }
        return {};
      },
      postLogin: {
        page: "/auth/oauth/select-organization",
        async shouldRedirect({ session, scopes, headers }) {
          const userOnlyScopes = [
            "openid",
            "profile",
            "email",
            "offline_access",
          ];
          if (scopes.every((scope) => userOnlyScopes.includes(scope))) {
            return false;
          }
          try {
            const organizations = (await getAllUserOrganizations(
              headers,
            )) as Organization[];
            return (
              organizations.length > 1 ||
              !(
                organizations.length === 1 &&
                organizations.at(0)?.id === session.activeOrganizationId
              )
            );
          } catch {
            return true;
          }
        },
        consentReferenceId({ session, scopes }) {
          if (!scopes.includes("read:organization")) return undefined;
          const activeOrganizationId = session?.activeOrganizationId as
            | string
            | undefined;
          if (!activeOrganizationId) {
            throw new APIError("BAD_REQUEST", {
              error: "set_organization",
              error_description: "must set organization for these scopes",
            });
          }
          return activeOrganizationId;
        },
      },
      silenceWarnings: {
        openidConfig: true,
        oauthAuthServerConfig: true,
      },
    }),
    electron(),
    ...(enableStripe
      ? [
          stripe({
            stripeClient: new Stripe(process.env.STRIPE_KEY || "sk_test_"),
            stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
            subscription: {
              enabled: true,
              allowReTrialsForDifferentPlans: true,
              plans: () => {
                const proPriceId = {
                  default:
                    process.env.STRIPE_PRO_PRICE_ID ||
                    "price_1RoxnRHmTADgihIt4y8c0lVE",
                  annual:
                    process.env.STRIPE_PRO_ANNUAL_PRICE_ID ||
                    "price_1RoxnoHmTADgihItzFvVP8KT",
                };
                const plusPriceId = {
                  default:
                    process.env.STRIPE_PLUS_PRICE_ID ||
                    "price_1RoxnJHmTADgihIthZTLmrPn",
                  annual:
                    process.env.STRIPE_PLUS_ANNUAL_PRICE_ID ||
                    "price_1Roxo5HmTADgihItEbJu5llL",
                };

                return [
                  {
                    name: "Plus",
                    priceId: plusPriceId.default,
                    annualDiscountPriceId: plusPriceId.annual,
                    freeTrial: {
                      days: 7,
                    },
                  },
                  {
                    name: "Pro",
                    priceId: proPriceId.default,
                    annualDiscountPriceId: proPriceId.annual,
                    freeTrial: {
                      days: 7,
                    },
                  },
                ];
              },
            },
          }),
        ]
      : []),
    ...(enableSSO ? [sso()] : []),
    ...(enableSCIM ? [scim()] : []),
  ],
  trustedOrigins: trustedOrigins?.length ? trustedOrigins : undefined,
  secondaryStorage,
  rateLimit: {
    enabled: rateLimitEnabled,
    window: rateLimitWindow,
    max: rateLimitMax,
    ...(rateLimitStorage ? { storage: rateLimitStorage } : {}),
  },
  advanced: {
    useSecureCookies: isProduction,
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    ...(authOptions.plugins ?? []),
    customSession(
      async ({ user, session }) => {
        const sessionUser = user as AuthChannelUserShape;
        const metadata = computeAuthChannelMetadataForUser(sessionUser);
        const metadataPatch = buildAuthChannelMetadataPatch(sessionUser);

        if (typeof sessionUser.id === "string" && Object.keys(metadataPatch).length) {
          void persistAuthChannelMetadataPatch(sessionUser.id, metadataPatch).catch(
            (error) => {
              console.error(
                "[better-auth] failed to auto-correct auth channel metadata",
                error,
              );
            },
          );
        }

        return {
          user: {
            ...user,
            ...(metadata.normalizedEmail ? { email: metadata.normalizedEmail } : {}),
            emailSource: metadata.emailSource,
            emailDeliverable: metadata.emailDeliverable,
            customField: "customField",
          },
          session,
        };
      },
      authOptions,
      {
        shouldMutateListDeviceSessionsEndpoint: true,
      },
    ),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type ActiveOrganization = typeof auth.$Infer.ActiveOrganization;
export type OrganizationRole = ActiveOrganization["members"][number]["role"];
export type DeviceSession = Awaited<
  ReturnType<typeof auth.api.listDeviceSessions>
>[number];

async function getAllDeviceSessions(headers: Headers): Promise<unknown[]> {
  return auth.api.listDeviceSessions({ headers });
}

async function getAllUserOrganizations(headers: Headers): Promise<unknown[]> {
  return auth.api.listOrganizations({ headers });
}
