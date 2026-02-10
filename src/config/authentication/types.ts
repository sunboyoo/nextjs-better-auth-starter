export type Identifier = "email" | "phone" | "username";

/**
 * Primary authentication methods (Step2).
 * smsOtp = SMS code as primary sign-in method.
 */
export type AuthenticationMethod =
  | "password"
  | "passkey"
  | "emailOtp"
  | "smsOtp"
  | "magicLink"
  | "social";

/**
 * MFA factors (Step3, conditional).
 * smsOtp = SMS code as second factor.
 */
export type MfaFactor = "totp" | "backupCode" | "emailOtp" | "smsOtp";

export type MfaPolicy = "disabled" | "ifUserEnabled" | "requiredForOrg" | "always";

export type AuthenticationPages = {
  identify: string; // /auth/sign-in
  method: string; // /auth/sign-in/method
  twoFactor: string; // /auth/sign-in/two-factor
  biometric?: string; // /auth/sign-in/biometric (optional)
};

export type SmsOtpDelivery =
  | {
      kind: "webhook";
      envUrl: "BETTER_AUTH_PHONE_OTP_WEBHOOK_URL";
      envSecret?: "BETTER_AUTH_PHONE_OTP_WEBHOOK_SECRET";
    }
  | { kind: "provider"; name: "twilio" | "sns" | "other" };

export type IdentifyStep = {
  identifiers: readonly Identifier[];
  primaryIdentifier: Identifier;
  socialPlacement: "hidden" | "step1" | "step2" | "both";
  antiEnumeration: {
    enabled: boolean;
    genericSuccessMessage: string;
  };
};

export type AuthenticateStep = {
  methods: readonly AuthenticationMethod[];
  preferred?: AuthenticationMethod;
  requireIdentifierFor: readonly AuthenticationMethod[];
  autoAttemptPasskey?: {
    enabled: boolean;
    when: "always" | "supportedOnly";
    maxAttempts: 1;
  };
};

export type BiometricStep = {
  enabled: boolean;
  method: "passkey";
  useDedicatedPage: boolean;
  completesSignInOnSuccess: boolean;
  fallback: { toMethodPage: boolean };
};

export type MfaRules = {
  policy: MfaPolicy;
  factors: readonly MfaFactor[];
  triggerOnPrimary: readonly AuthenticationMethod[];
  skipIfPrimaryIn: readonly AuthenticationMethod[];
};

export type ServerEnforcement = {
  basePath: string; // "/api/auth"
  allowedPrimaryMethods: readonly AuthenticationMethod[];

  /**
   * Method -> allowed better-auth endpoint patterns (ctx.path).
   * Keep readonly arrays so your config can be safely `as const`.
   */
  methodToPaths: Record<AuthenticationMethod, readonly (string | RegExp)[]>;

  allowCallbacks?: boolean;
};

export type AuthenticationProfile = {
  id: string;
  label: string;
  pages: AuthenticationPages;

  identify: IdentifyStep;
  authenticate: AuthenticateStep;
  mfa: MfaRules;

  biometric?: BiometricStep;

  /**
   * Only include when profile actually uses smsOtp (primary or MFA).
   */
  smsOtpDelivery?: SmsOtpDelivery;

  server: ServerEnforcement;
};
