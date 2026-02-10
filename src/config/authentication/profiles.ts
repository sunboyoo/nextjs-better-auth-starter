import type { AuthenticationProfile } from "./types";

/* ----------------------------- Shared constants ----------------------------- */

const PAGES_BASE: AuthenticationProfile["pages"] = {
  identify: "/auth/sign-in",
  method: "/auth/sign-in/method",
  twoFactor: "/auth/sign-in/two-factor",
};

const PAGES_WITH_BIOMETRIC: AuthenticationProfile["pages"] = {
  ...PAGES_BASE,
  biometric: "/auth/sign-in/biometric",
};

const ANTI_ENUM = {
  PASSWORD_SINGLE_SCREEN:
    "If the account exists, you’ll be able to continue. Please check your details and try again.",
  IDENTIFIER_FIRST:
    "If the account exists, you’ll receive the next step instructions.",
  IDENTIFIER_FIRST_BIOMETRICS:
    "If the account exists, you’ll be prompted to continue sign-in.",
} as const;

const SMS_WEBHOOK_DELIVERY: NonNullable<AuthenticationProfile["smsOtpDelivery"]> = {
  kind: "webhook",
  envUrl: "BETTER_AUTH_PHONE_OTP_WEBHOOK_URL",
  envSecret: "BETTER_AUTH_PHONE_OTP_WEBHOOK_SECRET",
};

/**
 * Default mapping from method -> better-auth ctx.path patterns.
 * IMPORTANT: refine smsOtp patterns after you log ctx.path once in your app.
 */
const DEFAULT_METHOD_PATHS: AuthenticationProfile["server"]["methodToPaths"] = {
  password: [
    /^\/sign-in\/email$/,
    /^\/sign-in\/phone-number$/,
    /^\/sign-in\/username$/,
  ],
  passkey: [/^\/sign-in\/passkey$/, /^\/passkey\//],
  emailOtp: [/^\/email-otp\//, /^\/sign-in\/email-otp$/],
  smsOtp: [
    /^\/phone-otp\//,
    /^\/phone-number\//,
    /^\/sign-in\/phone-otp$/,
    /^\/sign-in\/phone-number-otp$/,
  ],
  magicLink: [/^\/sign-in\/magic-link$/, /^\/magic-link\/verify$/],
  social: [/^\/sign-in\/social$/, /^\/callback\//, /^\/oauth2\/callback\//],
};

/**
 * Shared MFA policy:
 * - Only trigger MFA after password
 * - Passkey success skips MFA (your requirement: biometric success => no MFA)
 */
const MFA_DEFAULT: AuthenticationProfile["mfa"] = {
  policy: "ifUserEnabled",
  factors: ["totp", "backupCode"],
  triggerOnPrimary: ["password"],
  skipIfPrimaryIn: ["passkey"],
};


/* =============================================================================
   9 PROFILES (hard-coded, suffix-pruned as requested)

   *_EMAIL:
     - No phone/sms methods at all (no smsOtp, no phone identifier)
     - Allowed methods: password, passkey, emailOtp, magicLink, social (depending on flow)
   *_PHONE:
     - No email methods at all (no emailOtp, no magicLink, no email identifier)
     - Allowed methods: password, passkey, smsOtp, social (depending on flow)
   *_USERNAME:
     - Recommended: no email/phone OTP or magic link
     - Allowed methods: password, passkey, social (depending on flow)
============================================================================= */

/* -------------------- A) Identifier + Password (single screen) -------------------- */

export const PROFILE_IDENTIFIER_PASSWORD_EMAIL: AuthenticationProfile = {
  id: "identifier_password_email",
  label: "Identifier + Password (Email only)",
  pages: PAGES_BASE,

  identify: {
    identifiers: ["email"],
    primaryIdentifier: "email",
    socialPlacement: "hidden",
    antiEnumeration: { enabled: true, genericSuccessMessage: ANTI_ENUM.PASSWORD_SINGLE_SCREEN },
  },

  authenticate: {
    methods: ["password"],
    preferred: "password",
    requireIdentifierFor: ["password"],
    autoAttemptPasskey: { enabled: false, when: "supportedOnly", maxAttempts: 1 },
  },

  mfa: MFA_DEFAULT,

  server: {
    basePath: "/api/auth",
    allowedPrimaryMethods: ["password"],
    methodToPaths: DEFAULT_METHOD_PATHS ,
    allowCallbacks: false,
  },
};

export const PROFILE_IDENTIFIER_PASSWORD_PHONE: AuthenticationProfile = {
  id: "identifier_password_phone",
  label: "Identifier + Password (Phone only)",
  pages: PAGES_BASE,

  identify: {
    identifiers: ["phone"],
    primaryIdentifier: "phone",
    socialPlacement: "hidden",
    antiEnumeration: { enabled: true, genericSuccessMessage: ANTI_ENUM.PASSWORD_SINGLE_SCREEN },
  },

  authenticate: {
    methods: ["password"],
    preferred: "password",
    requireIdentifierFor: ["password"],
    autoAttemptPasskey: { enabled: false, when: "supportedOnly", maxAttempts: 1 },
  },

  mfa: MFA_DEFAULT,

  server: {
    basePath: "/api/auth",
    allowedPrimaryMethods: ["password"],
    methodToPaths: DEFAULT_METHOD_PATHS ,
    allowCallbacks: false,
  },
};

export const PROFILE_IDENTIFIER_PASSWORD_USERNAME: AuthenticationProfile = {
  id: "identifier_password_username",
  label: "Identifier + Password (Username only)",
  pages: PAGES_BASE,

  identify: {
    identifiers: ["username"],
    primaryIdentifier: "username",
    socialPlacement: "hidden",
    antiEnumeration: { enabled: true, genericSuccessMessage: ANTI_ENUM.PASSWORD_SINGLE_SCREEN },
  },

  authenticate: {
    methods: ["password"],
    preferred: "password",
    requireIdentifierFor: ["password"],
    autoAttemptPasskey: { enabled: false, when: "supportedOnly", maxAttempts: 1 },
  },

  mfa: MFA_DEFAULT,

  server: {
    basePath: "/api/auth",
    allowedPrimaryMethods: ["password"],
    methodToPaths: DEFAULT_METHOD_PATHS ,
    allowCallbacks: false,
  },
};

/* -------------------- B) Identifier First -------------------- */

export const PROFILE_IDENTIFIER_FIRST_EMAIL: AuthenticationProfile = {
  id: "identifier_first_email",
  label: "Identifier First (Email only)",
  pages: PAGES_BASE,

  identify: {
    identifiers: ["email"],
    primaryIdentifier: "email",
    socialPlacement: "step2",
    antiEnumeration: { enabled: true, genericSuccessMessage: ANTI_ENUM.IDENTIFIER_FIRST },
  },

  authenticate: {
    methods: ["passkey", "password", "emailOtp", "magicLink", "social"],
    preferred: "password",
    requireIdentifierFor: ["password", "emailOtp", "magicLink"],
    autoAttemptPasskey: { enabled: false, when: "supportedOnly", maxAttempts: 1 },
  },

  mfa: MFA_DEFAULT,

  server: {
    basePath: "/api/auth",
    allowedPrimaryMethods: ["passkey", "password", "emailOtp", "magicLink", "social"],
    methodToPaths: DEFAULT_METHOD_PATHS ,
    allowCallbacks: true,
  },
};

export const PROFILE_IDENTIFIER_FIRST_PHONE: AuthenticationProfile = {
  id: "identifier_first_phone",
  label: "Identifier First (Phone only)",
  pages: PAGES_BASE,

  identify: {
    identifiers: ["phone"],
    primaryIdentifier: "phone",
    socialPlacement: "step2",
    antiEnumeration: { enabled: true, genericSuccessMessage: ANTI_ENUM.IDENTIFIER_FIRST },
  },

  authenticate: {
    methods: ["passkey", "password", "smsOtp", "social"],
    preferred: "password",
    requireIdentifierFor: ["password", "smsOtp"],
    autoAttemptPasskey: { enabled: false, when: "supportedOnly", maxAttempts: 1 },
  },

  mfa: MFA_DEFAULT,

  smsOtpDelivery: SMS_WEBHOOK_DELIVERY,

  server: {
    basePath: "/api/auth",
    allowedPrimaryMethods: ["passkey", "password", "smsOtp", "social"],
    methodToPaths: DEFAULT_METHOD_PATHS ,
    allowCallbacks: true,
  },
};

export const PROFILE_IDENTIFIER_FIRST_USERNAME: AuthenticationProfile = {
  id: "identifier_first_username",
  label: "Identifier First (Username only)",
  pages: PAGES_BASE,

  identify: {
    identifiers: ["username"],
    primaryIdentifier: "username",
    socialPlacement: "step2",
    antiEnumeration: { enabled: true, genericSuccessMessage: ANTI_ENUM.IDENTIFIER_FIRST },
  },

  authenticate: {
    methods: ["passkey", "password", "social"],
    preferred: "password",
    requireIdentifierFor: ["password"],
    autoAttemptPasskey: { enabled: false, when: "supportedOnly", maxAttempts: 1 },
  },

  mfa: MFA_DEFAULT,

  server: {
    basePath: "/api/auth",
    allowedPrimaryMethods: ["passkey", "password", "social"],
    methodToPaths: DEFAULT_METHOD_PATHS ,
    allowCallbacks: true,
  },
};

/* -------------------- C) Identifier First + Biometrics -------------------- */

export const PROFILE_IDENTIFIER_FIRST_BIOMETRICS_EMAIL: AuthenticationProfile = {
  id: "identifier_first_biometrics_email",
  label: "Identifier First + Biometrics (Email only)",
  pages: PAGES_WITH_BIOMETRIC,

  identify: {
    identifiers: ["email"],
    primaryIdentifier: "email",
    socialPlacement: "step2",
    antiEnumeration: { enabled: true, genericSuccessMessage: ANTI_ENUM.IDENTIFIER_FIRST_BIOMETRICS },
  },

  biometric: {
    enabled: true,
    method: "passkey",
    useDedicatedPage: true,
    completesSignInOnSuccess: true,
    fallback: { toMethodPage: true },
  },

  authenticate: {
    // passkey is handled on biometric step; method page is fallback
    methods: ["password", "emailOtp", "magicLink", "social"],
    preferred: "password",
    requireIdentifierFor: ["password", "emailOtp", "magicLink"],
    autoAttemptPasskey: { enabled: false, when: "supportedOnly", maxAttempts: 1 },
  },

  mfa: MFA_DEFAULT,

  server: {
    basePath: "/api/auth",
    allowedPrimaryMethods: ["passkey", "password", "emailOtp", "magicLink", "social"],
    methodToPaths: DEFAULT_METHOD_PATHS ,
    allowCallbacks: true,
  },
};

export const PROFILE_IDENTIFIER_FIRST_BIOMETRICS_PHONE: AuthenticationProfile = {
  id: "identifier_first_biometrics_phone",
  label: "Identifier First + Biometrics (Phone only)",
  pages: PAGES_WITH_BIOMETRIC,

  identify: {
    identifiers: ["phone"],
    primaryIdentifier: "phone",
    socialPlacement: "step2",
    antiEnumeration: { enabled: true, genericSuccessMessage: ANTI_ENUM.IDENTIFIER_FIRST_BIOMETRICS },
  },

  biometric: {
    enabled: true,
    method: "passkey",
    useDedicatedPage: true,
    completesSignInOnSuccess: true,
    fallback: { toMethodPage: true },
  },

  authenticate: {
    methods: ["password", "smsOtp", "social"],
    preferred: "password",
    requireIdentifierFor: ["password", "smsOtp"],
    autoAttemptPasskey: { enabled: false, when: "supportedOnly", maxAttempts: 1 },
  },

  mfa: MFA_DEFAULT,

  smsOtpDelivery: SMS_WEBHOOK_DELIVERY,

  server: {
    basePath: "/api/auth",
    allowedPrimaryMethods: ["passkey", "password", "smsOtp", "social"],
    methodToPaths: DEFAULT_METHOD_PATHS ,
    allowCallbacks: true,
  },
};

export const PROFILE_IDENTIFIER_FIRST_BIOMETRICS_USERNAME: AuthenticationProfile = {
  id: "identifier_first_biometrics_username",
  label: "Identifier First + Biometrics (Username only)",
  pages: PAGES_WITH_BIOMETRIC,

  identify: {
    identifiers: ["username"],
    primaryIdentifier: "username",
    socialPlacement: "step2",
    antiEnumeration: { enabled: true, genericSuccessMessage: ANTI_ENUM.IDENTIFIER_FIRST_BIOMETRICS },
  },

  biometric: {
    enabled: true,
    method: "passkey",
    useDedicatedPage: true,
    completesSignInOnSuccess: true,
    fallback: { toMethodPage: true },
  },

  authenticate: {
    methods: ["password", "social"],
    preferred: "password",
    requireIdentifierFor: ["password"],
    autoAttemptPasskey: { enabled: false, when: "supportedOnly", maxAttempts: 1 },
  },

  mfa: MFA_DEFAULT,

  server: {
    basePath: "/api/auth",
    allowedPrimaryMethods: ["passkey", "password", "social"],
    methodToPaths: DEFAULT_METHOD_PATHS ,
    allowCallbacks: true,
  },
};

/* ----------------------------- Registry ----------------------------- */

export const AUTHENTICATION_PROFILES = {
  PROFILE_IDENTIFIER_PASSWORD_EMAIL,
  PROFILE_IDENTIFIER_PASSWORD_PHONE,
  PROFILE_IDENTIFIER_PASSWORD_USERNAME,

  PROFILE_IDENTIFIER_FIRST_EMAIL,
  PROFILE_IDENTIFIER_FIRST_PHONE,
  PROFILE_IDENTIFIER_FIRST_USERNAME,

  PROFILE_IDENTIFIER_FIRST_BIOMETRICS_EMAIL,
  PROFILE_IDENTIFIER_FIRST_BIOMETRICS_PHONE,
  PROFILE_IDENTIFIER_FIRST_BIOMETRICS_USERNAME,
} as const;

export type AuthenticationProfileKey = keyof typeof AUTHENTICATION_PROFILES;

export function getAuthenticationProfile(key: AuthenticationProfileKey): AuthenticationProfile {
  return AUTHENTICATION_PROFILES[key];
}
