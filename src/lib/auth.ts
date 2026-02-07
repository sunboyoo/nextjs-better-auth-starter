import { db } from "@/db";
import * as schema from "@/db/schema";
import { ac } from "@/lib/built-in-organization-role-permissions";
import { ORGANIZATION_INVITATION_EXPIRES_IN_DAYS } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { electron } from "@/lib/better-auth-electron/server";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import { scim } from "@better-auth/scim";
import { sso } from "@better-auth/sso";
import { stripe } from "@better-auth/stripe";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import type { Organization } from "better-auth/plugins";
import {
  admin,
  bearer,
  customSession,
  deviceAuthorization,
  jwt,
  lastLoginMethod,
  multiSession,
  oAuthProxy,
  oneTap,
  openAPI,
  organization,
  twoFactor,
} from "better-auth/plugins";
import { Stripe } from "stripe";

const isProduction = process.env.NODE_ENV === "production";
const baseUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

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

const enableStripe =
  process.env.BETTER_AUTH_ENABLE_STRIPE !== "false" &&
  Boolean(process.env.STRIPE_KEY) &&
  Boolean(process.env.STRIPE_WEBHOOK_SECRET);
const enableSSO = process.env.BETTER_AUTH_ENABLE_SSO !== "false";
const enableSCIM = process.env.BETTER_AUTH_ENABLE_SCIM !== "false";

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

const socialProviders = {
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      },
    }
    : {}),
  ...((
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  ) &&
    process.env.GOOGLE_CLIENT_SECRET
    ? {
      google: {
        prompt: "select_account" as const,
        clientId:
          process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    }
    : {}),
  ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
    ? {
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      },
    }
    : {}),
  ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ? {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
      },
    }
    : {}),
  ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
    ? {
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      },
    }
    : {}),
  ...(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
    ? {
      twitch: {
        clientId: process.env.TWITCH_CLIENT_ID,
        clientSecret: process.env.TWITCH_CLIENT_SECRET,
      },
    }
    : {}),
  ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
    ? {
      twitter: {
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      },
    }
    : {}),
  ...(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    ? {
      paypal: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      },
    }
    : {}),
  ...(process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET
    ? {
      vercel: {
        clientId: process.env.VERCEL_CLIENT_ID,
        clientSecret: process.env.VERCEL_CLIENT_SECRET,
      },
    }
    : {}),
};

const authOptions = {
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
      trustedProviders: [
        "email-password",
        "facebook",
        "github",
        "google",
        "discord",
        "microsoft",
        "twitch",
        "twitter",
        "paypal",
        "vercel",
      ],
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
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Confirm account deletion",
          text: `We received a request to delete your account. If you did not make this request, please ignore this email. To confirm deletion, click: ${url}`,
        });
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    async sendResetPassword({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
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
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  ...(Object.keys(socialProviders).length ? { socialProviders } : {}),
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
      invitationExpiresIn: ORGANIZATION_INVITATION_EXPIRES_IN_DAYS * 24 * 60 * 60,
      requireEmailVerificationOnInvitation: true,
      async sendInvitationEmail(data) {
        const inviteLink = `${baseUrl}/auth/accept-invitation/${data.id}`;
        await sendEmail({
          to: data.email,
          subject: `You've been invited to join ${data.organization.name}`,
          text: `${data.inviter.user.name} (${data.inviter.user.email}) has invited you to join ${data.organization.name}.\n\nClick here to accept the invitation: ${inviteLink}\n\nThis invitation will expire at ${data.invitation.expiresAt.toISOString()}.`,
        });
      },
    }),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          await sendEmail({
            to: user.email,
            subject: "Your two-factor authentication code",
            text: `Your OTP code is: ${otp}`,
          });
        },
      },
    }),
    passkey(),
    openAPI(),
    bearer(),
    multiSession(),
    deviceAuthorization({
      expiresIn: "3min",
      interval: "5s",
    }),
    lastLoginMethod(),
    oAuthProxy({
      productionURL: baseUrl,
    }),
    oneTap(),
    jwt({
      jwt: {
        issuer: baseUrl,
      },
    }),
    oauthProvider({
      loginPage: "/auth/sign-in",
      consentPage: "/auth/oauth/consent",
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      scopes: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "read:organization",
      ],
      validAudiences: [baseUrl, `${baseUrl}/api/mcp`],
      selectAccount: {
        page: "/auth/oauth/select-account",
        shouldRedirect: async ({ headers }) => {
          const sessions = await getAllDeviceSessions(headers);
          return sessions.length >= 1;
        },
      },
      customAccessTokenClaims({ referenceId, scopes }) {
        if (referenceId && scopes.includes("read:organization")) {
          return {
            [`${baseUrl}/org`]: referenceId,
          };
        }
        return {};
      },
      postLogin: {
        page: "/auth/oauth/select-organization",
        async shouldRedirect({ session, scopes, headers }) {
          const userOnlyScopes = ["openid", "profile", "email", "offline_access"];
          if (scopes.every((scope) => userOnlyScopes.includes(scope))) {
            return false;
          }
          try {
            const organizations = (await getAllUserOrganizations(
              headers,
            )) as Organization[];
            return (
              organizations.length > 1 ||
              !(
                organizations.length === 1 &&
                organizations.at(0)?.id === session.activeOrganizationId
              )
            );
          } catch {
            return true;
          }
        },
        consentReferenceId({ session, scopes }) {
          if (!scopes.includes("read:organization")) return undefined;
          const activeOrganizationId = session?.activeOrganizationId as
            | string
            | undefined;
          if (!activeOrganizationId) {
            throw new APIError("BAD_REQUEST", {
              error: "set_organization",
              error_description: "must set organization for these scopes",
            });
          }
          return activeOrganizationId;
        },
      },
      silenceWarnings: {
        openidConfig: true,
        oauthAuthServerConfig: true,
      },
    }),
    electron(),
    ...(enableStripe
      ? [
        stripe({
          stripeClient: new Stripe(process.env.STRIPE_KEY || "sk_test_"),
          stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
          subscription: {
            enabled: true,
            allowReTrialsForDifferentPlans: true,
            plans: () => {
              const proPriceId = {
                default:
                  process.env.STRIPE_PRO_PRICE_ID ||
                  "price_1RoxnRHmTADgihIt4y8c0lVE",
                annual:
                  process.env.STRIPE_PRO_ANNUAL_PRICE_ID ||
                  "price_1RoxnoHmTADgihItzFvVP8KT",
              };
              const plusPriceId = {
                default:
                  process.env.STRIPE_PLUS_PRICE_ID ||
                  "price_1RoxnJHmTADgihIthZTLmrPn",
                annual:
                  process.env.STRIPE_PLUS_ANNUAL_PRICE_ID ||
                  "price_1Roxo5HmTADgihItEbJu5llL",
              };

              return [
                {
                  name: "Plus",
                  priceId: plusPriceId.default,
                  annualDiscountPriceId: plusPriceId.annual,
                  freeTrial: {
                    days: 7,
                  },
                },
                {
                  name: "Pro",
                  priceId: proPriceId.default,
                  annualDiscountPriceId: proPriceId.annual,
                  freeTrial: {
                    days: 7,
                  },
                },
              ];
            },
          },
        }),
      ]
      : []),
    ...(enableSSO ? [sso()] : []),
    ...(enableSCIM ? [scim()] : []),
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
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    ...(authOptions.plugins ?? []),
    customSession(
      async ({ user, session }) => ({
        user: {
          ...user,
          customField: "customField",
        },
        session,
      }),
      authOptions,
      {
        shouldMutateListDeviceSessionsEndpoint: true,
      },
    ),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type ActiveOrganization = typeof auth.$Infer.ActiveOrganization;
export type OrganizationRole = ActiveOrganization["members"][number]["role"];
export type DeviceSession = Awaited<
  ReturnType<typeof auth.api.listDeviceSessions>
>[number];

async function getAllDeviceSessions(headers: Headers): Promise<unknown[]> {
  return auth.api.listDeviceSessions({ headers });
}

async function getAllUserOrganizations(headers: Headers): Promise<unknown[]> {
  return auth.api.listOrganizations({ headers });
}
