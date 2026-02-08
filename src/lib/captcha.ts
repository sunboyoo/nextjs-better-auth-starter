const CAPTCHA_HEADER_NAME = "x-captcha-response";

const clientCaptchaEnabled =
  process.env.NEXT_PUBLIC_BETTER_AUTH_CAPTCHA_ENABLED === "true";
const clientCaptchaProvider =
  process.env.NEXT_PUBLIC_BETTER_AUTH_CAPTCHA_PROVIDER ||
  "cloudflare-turnstile";
const clientCaptchaSiteKey =
  process.env.NEXT_PUBLIC_BETTER_AUTH_CAPTCHA_SITE_KEY || "";

export function isCaptchaEnabled(): boolean {
  return clientCaptchaEnabled;
}

export function getCaptchaProvider(): string {
  return clientCaptchaProvider;
}

export function getCaptchaSiteKey(): string {
  return clientCaptchaSiteKey;
}

export function getCaptchaHeaders(
  token: string | null | undefined,
): Record<string, string> | undefined {
  if (!token) return undefined;

  return {
    [CAPTCHA_HEADER_NAME]: token,
  };
}

