export const PASSWORD_PROVIDER_IDS = ["credential", "email-password"] as const;

export function isPasswordProviderId(providerId: string): boolean {
  return PASSWORD_PROVIDER_IDS.includes(
    providerId as (typeof PASSWORD_PROVIDER_IDS)[number],
  );
}
