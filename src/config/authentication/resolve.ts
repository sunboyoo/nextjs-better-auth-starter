import type { AuthenticationProfile } from "./types";
import {
  AUTHENTICATION_PROFILES,
  type AuthenticationProfileKey,
  getAuthenticationProfile,
} from "./profiles";

/**
 * You can set this to either:
 * - a registry key (e.g. "PROFILE_IDENTIFIER_FIRST_EMAIL")
 * - or a profile.id (e.g. "identifier_first_email")
 */
export const AUTH_PROFILE_ENV_KEY = "AUTHENTICATION_PROFILE";

/**
 * Default fallback: registry key
 */
export const DEFAULT_AUTH_PROFILE_KEY: AuthenticationProfileKey =
  "PROFILE_IDENTIFIER_FIRST_EMAIL";

function isProfileKey(value: string): value is AuthenticationProfileKey {
  return Object.prototype.hasOwnProperty.call(AUTHENTICATION_PROFILES, value);
}

function findProfileById(profileId: string): AuthenticationProfile | undefined {
  for (const profile of Object.values(AUTHENTICATION_PROFILES)) {
    if (profile.id === profileId) return profile;
  }
  return undefined;
}

/**
 * Resolve by explicit key or id.
 * - If value matches a registry key => return that profile
 * - Else if value matches a profile.id => return that profile
 * - Else fallback to DEFAULT_AUTH_PROFILE_KEY
 */
export function resolveAuthenticationProfile(
  value: string | null | undefined
): AuthenticationProfile {
  if (!value) return getAuthenticationProfile(DEFAULT_AUTH_PROFILE_KEY);

  if (isProfileKey(value)) return getAuthenticationProfile(value);

  const byId = findProfileById(value);
  if (byId) return byId;

  console.warn(
    `[auth-profile] Invalid ${AUTH_PROFILE_ENV_KEY} value "${value}". Falling back to ${DEFAULT_AUTH_PROFILE_KEY}.`,
  );
  return getAuthenticationProfile(DEFAULT_AUTH_PROFILE_KEY);
}

/**
 * Server-only resolution via env.
 */
export function getActiveAuthenticationProfileServer(): AuthenticationProfile {
  return resolveAuthenticationProfile(process.env[AUTH_PROFILE_ENV_KEY]);
}

/**
 * If you need the stable identifier for storage (DB/cookie), use profile.id.
 */
export function getAuthenticationProfileId(profile: AuthenticationProfile): string {
  return profile.id;
}

/**
 * If you really need the registry key (rare), derive it from id.
 */
export function getAuthenticationProfileKey(profile: AuthenticationProfile): AuthenticationProfileKey | undefined {
  const entries = Object.entries(AUTHENTICATION_PROFILES) as Array<
    [AuthenticationProfileKey, AuthenticationProfile]
  >;

  for (const [key, p] of entries) {
    if (p.id === profile.id) return key;
  }
  return undefined;
}
