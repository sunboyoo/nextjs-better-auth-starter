export type EmailSource = "synthetic" | "user_provided";
export type PrimaryAuthChannel = "phone" | "email" | "mixed";

type ChannelMetadataInput = {
  email?: string | null;
  emailVerified?: boolean | null;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeSyntheticEmailDomain(
  domain: string | undefined | null,
): string {
  return (domain || "phone.invalid")
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

export function isSyntheticEmail(
  email: string | undefined | null,
  syntheticEmailDomain: string,
): boolean {
  if (!email) return false;
  return normalizeEmail(email).endsWith(`@${syntheticEmailDomain}`);
}

export function hasVerifiedEmailChannel(
  input: ChannelMetadataInput & { syntheticEmailDomain: string },
): boolean {
  if (!input.email) return false;
  if (isSyntheticEmail(input.email, input.syntheticEmailDomain)) return false;
  return input.emailVerified === true;
}

export function hasVerifiedPhoneChannel(input: ChannelMetadataInput): boolean {
  return Boolean(input.phoneNumber && input.phoneNumberVerified === true);
}

export function getAuthChannelMetadata(
  input: ChannelMetadataInput & { syntheticEmailDomain: string },
): {
  normalizedEmail: string | undefined;
  emailSource: EmailSource;
  emailDeliverable: boolean;
  primaryAuthChannel: PrimaryAuthChannel;
} {
  const normalizedEmail = input.email ? normalizeEmail(input.email) : undefined;
  const synthetic = isSyntheticEmail(normalizedEmail, input.syntheticEmailDomain);
  const emailSource: EmailSource = synthetic ? "synthetic" : "user_provided";
  const emailDeliverable = !synthetic;
  const verifiedEmail = hasVerifiedEmailChannel({
    email: normalizedEmail,
    emailVerified: input.emailVerified,
    phoneNumber: input.phoneNumber,
    phoneNumberVerified: input.phoneNumberVerified,
    syntheticEmailDomain: input.syntheticEmailDomain,
  });
  const verifiedPhone = hasVerifiedPhoneChannel(input);
  const hasPhone = Boolean(input.phoneNumber);

  const primaryAuthChannel: PrimaryAuthChannel = verifiedEmail && verifiedPhone
    ? "mixed"
    : verifiedPhone
      ? "phone"
      : verifiedEmail
        ? "email"
        : hasPhone
          ? "phone"
          : "email";

  return {
    normalizedEmail,
    emailSource,
    emailDeliverable,
    primaryAuthChannel,
  };
}
