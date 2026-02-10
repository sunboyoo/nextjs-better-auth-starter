export type Identifier = "email" | "phone" | "username";

export type AuthenticationMethod =
  | "password"
  | "passkey"
  | "emailOtp"
  | "smsOtp"
  | "magicLink"
  | "social";

export type MfaFactor =
  | "totp"
  | "backupCode"
  | "emailOtp"
  | "smsOtp";

export type MfaPolicy =
  | "disabled"
  | "ifUserEnabled"
  | "requiredForOrg"
  | "always";

export type AuthenticationPages = {
  identify: string;     // /auth/sign-in
  method: string;       // /auth/sign-in/method
  twoFactor: string;    // /auth/sign-in/two-factor
  biometric?: string;   // /auth/sign-in/biometric (optional)
};

export type IdentifyStep = {
  identifiers: Identifier[];
  primaryIdentifier: Identifier;
  socialPlacement: "hidden" | "step1" | "step2" | "both";
  antiEnumeration: {
    enabled: boolean;
    genericSuccessMessage: string;
  };
};

export type AuthenticateStep = {
  methods: AuthenticationMethod[];
  preferred?: AuthenticationMethod;
  requireIdentifierFor: AuthenticationMethod[];
  autoAttempt?: {
    method: "passkey";
    when: "always" | "supportedOnly";
    maxAttempts: 1;
  };
};

export type BiometricStep = {
  enabled: boolean;
  method: "passkey";
  useDedicatedPage: boolean;
  fallback: { toMethodPage: boolean };
  completesSignInOnSuccess: boolean;
};

export type MfaRules = {
  policy: MfaPolicy;
  factors: MfaFactor[];

  // 哪些 primary method 会触发 MFA（典型：password）
  triggerOnPrimary: AuthenticationMethod[];

  // 哪些 primary method 视为已满足强认证（典型：passkey）
  satisfiedByPrimary: AuthenticationMethod[];
};

export type ServerEnforcement = {
  basePath: string; // "/api/auth"
  allowedMethods: AuthenticationMethod[];
  methodToPaths: Record<AuthenticationMethod, Array<string | RegExp>>;
  allowCallbacks?: boolean;
};

export type AuthenticationProfile = {
  id: string;
  label: string;
  pages: AuthenticationPages;

  identify: IdentifyStep;
  authenticate: AuthenticateStep;

  // 仅 profile3 用（Identifier First + Biometrics）
  biometric?: BiometricStep;

  mfa: MfaRules;

  server: ServerEnforcement;
};
