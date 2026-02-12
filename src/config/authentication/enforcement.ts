import type { AuthenticationMethod, AuthenticationProfile } from "./types";

const CALLBACK_PREFIXES = ["/callback/", "/oauth2/callback/"] as const;
const PASSKEY_SIGN_IN_PREFIXES = [
  "/passkey/generate-authentication-options",
  "/passkey/verify-authentication",
] as const;
const ADDITIONAL_SIGN_IN_PATHS = ["/magic-link/verify"] as const;
const MAX_AUTH_PATH_LENGTH = 512;

function isRegexPattern(value: string | RegExp): value is RegExp {
  return value instanceof RegExp;
}

export function matchesAuthPathPattern(
  path: string,
  pattern: string | RegExp,
): boolean {
  if (path.length === 0 || path.length > MAX_AUTH_PATH_LENGTH) {
    return false;
  }

  if (isRegexPattern(pattern)) {
    // Ensure regex state is deterministic even if a global pattern is introduced later.
    pattern.lastIndex = 0;
    return pattern.test(path);
  }

  return path === pattern;
}

export function findAuthenticationMethodForPath(
  profile: Pick<AuthenticationProfile, "server">,
  path: string,
): AuthenticationMethod | null {
  const methodEntries = Object.entries(profile.server.methodToPaths) as Array<
    [AuthenticationMethod, readonly (string | RegExp)[]]
  >;

  for (const [method, patterns] of methodEntries) {
    if (patterns.some((pattern) => matchesAuthPathPattern(path, pattern))) {
      return method;
    }
  }

  return null;
}

export function isAuthCallbackPath(path: string): boolean {
  return CALLBACK_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function isPrimarySignInFlowPath(path: string): boolean {
  if (path.startsWith("/sign-in/")) {
    return true;
  }

  if (isAuthCallbackPath(path)) {
    return true;
  }

  if (ADDITIONAL_SIGN_IN_PATHS.includes(path as (typeof ADDITIONAL_SIGN_IN_PATHS)[number])) {
    return true;
  }

  return PASSKEY_SIGN_IN_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function isPrimaryMethodAllowed(
  profile: Pick<AuthenticationProfile, "server">,
  method: AuthenticationMethod,
): boolean {
  return profile.server.allowedPrimaryMethods.includes(method);
}
