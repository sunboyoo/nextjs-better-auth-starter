import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { ac } from "@/lib/built-in-organization-role-permissions";
import { ORGANIZATION_INVITATION_EXPIRES_IN_DAYS } from "@/lib/constants";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const isProduction = process.env.NODE_ENV === "production";
const trustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const rateLimitEnabled = process.env.BETTER_AUTH_RATE_LIMIT_ENABLED
  ? process.env.BETTER_AUTH_RATE_LIMIT_ENABLED === "true"
  : isProduction;
const rateLimitWindowRaw = Number.parseInt(
  process.env.BETTER_AUTH_RATE_LIMIT_WINDOW ?? "",
  10,
);
const rateLimitMaxRaw = Number.parseInt(
  process.env.BETTER_AUTH_RATE_LIMIT_MAX ?? "",
  10,
);
const rateLimitWindow = Number.isNaN(rateLimitWindowRaw)
  ? 10
  : Math.max(1, rateLimitWindowRaw);
const rateLimitMax = Number.isNaN(rateLimitMaxRaw)
  ? 100
  : Math.max(1, rateLimitMaxRaw);
const rateLimitStorage =
  process.env.BETTER_AUTH_RATE_LIMIT_STORAGE === "memory" ||
    process.env.BETTER_AUTH_RATE_LIMIT_STORAGE === "database" ||
    process.env.BETTER_AUTH_RATE_LIMIT_STORAGE === "secondary-storage"
    ? process.env.BETTER_AUTH_RATE_LIMIT_STORAGE
    : undefined;

type SecondaryStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

const memorySecondaryStorage: SecondaryStorage = (() => {
  const store = new Map<string, { value: string; expiresAt?: number }>();

  return {
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, ttl) {
      const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
      store.set(key, { value, expiresAt });
    },
    async delete(key) {
      store.delete(key);
    },
  };
})();

const secondaryStorage =
  process.env.BETTER_AUTH_SECONDARY_STORAGE === "memory"
    ? memorySecondaryStorage
    : undefined;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.user,
    },
  }),
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Confirm your email change",
          text: `We received a request to change your account email to ${newEmail}. Confirm this change by clicking: ${url}`,
        });
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    nextCookies(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    organization({
      ac,
      dynamicAccessControl: {
        enabled: true,
      },
      invitationExpiresIn: ORGANIZATION_INVITATION_EXPIRES_IN_DAYS * 24 * 60 * 60, // Convert days to seconds
      requireEmailVerificationOnInvitation: true,
      async sendInvitationEmail(data) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const inviteLink = `${baseUrl}/accept-invitation/${data.id}`;
        await sendEmail({
          to: data.email,
          subject: `You've been invited to join ${data.organization.name}`,
          text: `${data.inviter.user.name} (${data.inviter.user.email}) has invited you to join ${data.organization.name}.\n\nClick here to accept the invitation: ${inviteLink}\n\nThis invitation will expire at ${data.invitation.expiresAt.toISOString()}.`,
        });
      },
    }),
  ],
  trustedOrigins: trustedOrigins?.length ? trustedOrigins : undefined,
  secondaryStorage,
  rateLimit: {
    enabled: rateLimitEnabled,
    window: rateLimitWindow,
    max: rateLimitMax,
    ...(rateLimitStorage ? { storage: rateLimitStorage } : {}),
  },
  advanced: {
    useSecureCookies: isProduction,
  },
});
