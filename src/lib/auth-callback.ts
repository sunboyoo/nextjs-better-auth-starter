import { DEFAULT_LOGIN_REDIRECT } from "@/lib/config";

export function getSafeCallbackUrl(
  raw: string | null,
  fallback: string = DEFAULT_LOGIN_REDIRECT,
) {
  if (!raw) return fallback;

  // Only allow relative paths to avoid open redirects.
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  return fallback;
}
