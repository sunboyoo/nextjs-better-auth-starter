import type {
  AuthenticationMethod,
  AuthenticationProfile,
  Identifier,
} from "@/config/authentication/types";
import { getSafeCallbackUrl } from "@/lib/auth-callback";

export const AUTH_FLOW_CALLBACK_PARAM = "callbackUrl";
export const AUTH_FLOW_IDENTIFIER_PARAM = "identifier";
export const AUTH_FLOW_IDENTIFIER_TYPE_PARAM = "identifierType";

type SearchParamsLike = {
  get: (name: string) => string | null;
};

const METHODS_REQUIRING_SECOND_STEP: readonly AuthenticationMethod[] = [
  "passkey",
  "emailOtp",
  "smsOtp",
  "magicLink",
];

export type SignInFlowContext = {
  callbackUrl: string;
  identifierType: Identifier | null;
  identifier: string | null;
};

export function parseIdentifierType(value: string | null | undefined): Identifier | null {
  if (value === "email" || value === "phone" || value === "username") {
    return value;
  }

  return null;
}

export function normalizeIdentifierValue(
  identifierType: Identifier,
  value: string,
): string {
  const trimmed = value.trim();

  if (identifierType === "email" || identifierType === "username") {
    return trimmed.toLowerCase();
  }

  return trimmed;
}

export function getSignInFlowContext(
  params: SearchParamsLike,
): SignInFlowContext {
  const callbackUrl = getSafeCallbackUrl(params.get(AUTH_FLOW_CALLBACK_PARAM));
  const identifierType = parseIdentifierType(
    params.get(AUTH_FLOW_IDENTIFIER_TYPE_PARAM),
  );

  if (!identifierType) {
    return {
      callbackUrl,
      identifierType: null,
      identifier: null,
    };
  }

  const rawIdentifier = params.get(AUTH_FLOW_IDENTIFIER_PARAM);
  const normalizedIdentifier =
    typeof rawIdentifier === "string"
      ? normalizeIdentifierValue(identifierType, rawIdentifier)
      : "";

  return {
    callbackUrl,
    identifierType,
    identifier: normalizedIdentifier || null,
  };
}

export function buildAuthPageUrl(
  path: string,
  context: SignInFlowContext,
): string {
  const searchParams = new URLSearchParams();

  searchParams.set(AUTH_FLOW_CALLBACK_PARAM, context.callbackUrl);

  if (context.identifierType && context.identifier) {
    searchParams.set(AUTH_FLOW_IDENTIFIER_TYPE_PARAM, context.identifierType);
    searchParams.set(AUTH_FLOW_IDENTIFIER_PARAM, context.identifier);
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function profileSupportsIdentifier(
  profile: Pick<AuthenticationProfile, "identify">,
  identifier: Identifier,
): boolean {
  return profile.identify.identifiers.includes(identifier);
}

export function profileSupportsMethod(
  profile: Pick<AuthenticationProfile, "authenticate">,
  method: AuthenticationMethod,
): boolean {
  return profile.authenticate.methods.includes(method);
}

export function shouldUseIdentifierFirst(
  profile: Pick<AuthenticationProfile, "authenticate" | "biometric">,
): boolean {
  if (profile.biometric?.enabled) {
    return true;
  }

  if (profile.authenticate.autoAttemptPasskey?.enabled) {
    return true;
  }

  return profile.authenticate.methods.some((method) =>
    METHODS_REQUIRING_SECOND_STEP.includes(method),
  );
}

export function shouldUseDedicatedBiometricPage(
  profile: Pick<AuthenticationProfile, "biometric">,
): boolean {
  return (
    profile.biometric?.enabled === true &&
    profile.biometric.useDedicatedPage === true &&
    profile.biometric.method === "passkey"
  );
}

export function shouldShowSocialForStep(
  profile: Pick<AuthenticationProfile, "identify" | "authenticate">,
  step: "step1" | "step2",
): boolean {
  if (!profile.authenticate.methods.includes("social")) {
    return false;
  }

  if (profile.identify.socialPlacement === "both") {
    return true;
  }

  if (profile.identify.socialPlacement === "hidden") {
    return false;
  }

  return profile.identify.socialPlacement === step;
}

export function requiresIdentifierForMethod(
  profile: Pick<AuthenticationProfile, "authenticate">,
  method: AuthenticationMethod,
): boolean {
  return profile.authenticate.requireIdentifierFor.includes(method);
}

export function isMethodCompatibleWithIdentifier(
  method: AuthenticationMethod,
  identifierType: Identifier | null,
): boolean {
  if (!identifierType) {
    return method === "passkey" || method === "social";
  }

  if (method === "emailOtp" || method === "magicLink") {
    return identifierType === "email";
  }

  if (method === "smsOtp") {
    return identifierType === "phone";
  }

  if (method === "password") {
    return true;
  }

  return true;
}
