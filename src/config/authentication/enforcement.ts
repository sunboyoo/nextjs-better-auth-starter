import type { AuthenticationMethod, AuthenticationProfile } from "./types";

const CALLBACK_PREFIXES = ["/callback/", "/oauth2/callback/"] as const;

function isRegexPattern(value: string | RegExp): value is RegExp {
  return value instanceof RegExp;
}

export function matchesAuthPathPattern(
  path: string,
  pattern: string | RegExp,
): boolean {
  if (isRegexPattern(pattern)) {
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

export function isPrimaryMethodAllowed(
  profile: Pick<AuthenticationProfile, "server">,
  method: AuthenticationMethod,
): boolean {
  return profile.server.allowedPrimaryMethods.includes(method);
}
