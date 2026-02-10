// config/authentication/resolve.ts

import type { AuthenticationProfile } from "./types";
import {
  AUTHENTICATION_PROFILES,
  type AuthenticationProfileKey,
  getAuthenticationProfile,
} from "./profiles";

/**
 * Recommended env key for deployment-time selection.
 * Keep it server-side by default.
 */
export const AUTH_PROFILE_ENV_KEY = "AUTHENTICATION_PROFILE";

/**
 * Pick a sensible default (choose what you want as your global fallback).
 */
export const DEFAULT_AUTH_PROFILE_KEY: AuthenticationProfileKey = "PROFILE_IDENTIFIER_FIRST_EMAIL";

/**
 * Resolve by explicit key (e.g., from DB/org policy).
 * Returns a profile; falls back to DEFAULT_AUTH_PROFILE_KEY if unknown.
 */
export function resolveAuthenticationProfile(
  key: string | null | undefined
): AuthenticationProfile {
  if (!key) return getAuthenticationProfile(DEFAULT_AUTH_PROFILE_KEY);

  // Typesafe map check
  if (key in AUTHENTICATION_PROFILES) {
    return (AUTHENTICATION_PROFILES as Record<string, AuthenticationProfile>)[key];
  }

  return getAuthenticationProfile(DEFAULT_AUTH_PROFILE_KEY);
}

/**
 * Server-side active profile resolution via env.
 * Use this in:
 * - Next.js Server Components
 * - Route Handlers
 * - Server Actions
 */
export function getActiveAuthenticationProfileServer(): AuthenticationProfile {
  const key = process.env[AUTH_PROFILE_ENV_KEY];
  return resolveAuthenticationProfile(key);
}

/**
 * Optional helper if you DO want to expose a profile choice to the client:
 * You should pass the resolved profile (or just its id/key) from server -> client as props,
 * rather than reading env directly in client components.
 */
export function getAuthenticationProfileKeyFromProfile(profile: AuthenticationProfile): string {
  return profile.id;
}
