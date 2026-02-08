import { getSafeCallbackUrl } from "@/lib/auth-callback";

const MAGIC_LINK_SENT_PATH = "/auth/magic-link/sent";
const MAGIC_LINK_NEW_USER_PATH = "/auth/magic-link/new-user";
const MAGIC_LINK_ERROR_PATH = "/auth/magic-link/error";

export function buildMagicLinkSentURL(email: string, callbackUrl: string): string {
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);
  const searchParams = new URLSearchParams({
    callbackUrl: safeCallbackUrl,
  });

  if (email) {
    searchParams.set("email", email);
  }

  return `${MAGIC_LINK_SENT_PATH}?${searchParams.toString()}`;
}

export function buildMagicLinkNewUserCallbackURL(callbackUrl: string): string {
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);
  const searchParams = new URLSearchParams({
    callbackUrl: safeCallbackUrl,
  });

  return `${MAGIC_LINK_NEW_USER_PATH}?${searchParams.toString()}`;
}

export function buildMagicLinkErrorCallbackURL(callbackUrl: string): string {
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);
  const searchParams = new URLSearchParams({
    callbackUrl: safeCallbackUrl,
  });

  return `${MAGIC_LINK_ERROR_PATH}?${searchParams.toString()}`;
}

export function buildSignInUrl(callbackUrl: string): string {
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);
  const searchParams = new URLSearchParams({
    callbackUrl: safeCallbackUrl,
  });

  return `/auth/sign-in?${searchParams.toString()}`;
}

export function getMagicLinkSafeCallbackUrl(rawCallbackUrl: string | null): string {
  return getSafeCallbackUrl(rawCallbackUrl);
}

