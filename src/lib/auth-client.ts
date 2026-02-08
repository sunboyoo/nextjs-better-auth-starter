import { createAuthClient } from "better-auth/react";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import {
  customSessionClient,
  deviceAuthorizationClient,
  emailOTPClient,
  lastLoginMethodClient,
  magicLinkClient,
  multiSessionClient,
  oneTapClient,
  organizationClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { stripeClient } from "@better-auth/stripe/client";
import { toast } from "sonner";
import { ac } from "@/lib/built-in-organization-role-permissions";
import { electronProxyClient } from "@/lib/better-auth-electron/client";
import type { auth } from "@/lib/auth";

const enableStripe =
  process.env.NEXT_PUBLIC_BETTER_AUTH_ENABLE_STRIPE !== "false";
const electronScheme =
  process.env.NEXT_PUBLIC_BETTER_AUTH_ELECTRON_SCHEME ||
  "com.nextjs.better-auth.starter";
const oneTapEnabled =
  process.env.NEXT_PUBLIC_BETTER_AUTH_ENABLE_ONE_TAP !== "false";
const googleOneTapClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
type OneTapContext = "signin" | "signup" | "use";
const oneTapContextRaw =
  process.env.NEXT_PUBLIC_BETTER_AUTH_ONE_TAP_CONTEXT || "signin";
const oneTapContext = (["signin", "signup", "use"] as const).includes(
  oneTapContextRaw as OneTapContext,
)
  ? (oneTapContextRaw as OneTapContext)
  : "signin";
const oneTapBaseDelayRaw = Number.parseInt(
  process.env.NEXT_PUBLIC_BETTER_AUTH_ONE_TAP_BASE_DELAY ?? "",
  10,
);
const oneTapBaseDelay = Number.isNaN(oneTapBaseDelayRaw)
  ? 1000
  : Math.max(100, oneTapBaseDelayRaw);
const oneTapMaxAttemptsRaw = Number.parseInt(
  process.env.NEXT_PUBLIC_BETTER_AUTH_ONE_TAP_MAX_ATTEMPTS ?? "",
  10,
);
const oneTapMaxAttempts = Number.isNaN(oneTapMaxAttemptsRaw)
  ? 5
  : Math.max(1, oneTapMaxAttemptsRaw);
const oneTapFedCMRaw = process.env.NEXT_PUBLIC_BETTER_AUTH_ONE_TAP_FEDCM;
const oneTapFedCM = oneTapFedCMRaw === "true";
const oneTapAutoSelect =
  process.env.NEXT_PUBLIC_BETTER_AUTH_ONE_TAP_AUTO_SELECT === "true";
const oneTapCancelOnTapOutsideRaw =
  process.env.NEXT_PUBLIC_BETTER_AUTH_ONE_TAP_CANCEL_ON_TAP_OUTSIDE;
// cancelOnTapOutside is incompatible with FedCM (per Better Auth docs)
const oneTapCancelOnTapOutside = oneTapFedCM
  ? undefined
  : oneTapCancelOnTapOutsideRaw === "true"
    ? true
    : oneTapCancelOnTapOutsideRaw === "false"
      ? false
      : true;

export const isGoogleOneTapConfigured =
  oneTapEnabled && googleOneTapClientId.length > 0;

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac,
      dynamicAccessControl: {
        enabled: true,
      },
    }),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/auth/two-factor";
      },
    }),
    multiSessionClient(),
    deviceAuthorizationClient(),
    lastLoginMethodClient(),
    emailOTPClient(),
    phoneNumberClient(),
    magicLinkClient(),
    usernameClient(),
    passkeyClient(),
    oauthProviderClient(),
    ...(enableStripe
      ? [
          stripeClient({
            subscription: true,
          }),
        ]
      : []),
    electronProxyClient({
      protocol: {
        scheme: electronScheme,
      },
    }),
    customSessionClient<typeof auth>(),
    oneTapClient({
      clientId: googleOneTapClientId,
      autoSelect: oneTapAutoSelect,
      ...(typeof oneTapCancelOnTapOutside === "boolean"
        ? { cancelOnTapOutside: oneTapCancelOnTapOutside }
        : {}),
      context: oneTapContext,
      promptOptions: {
        baseDelay: oneTapBaseDelay,
        maxAttempts: oneTapMaxAttempts,
        fedCM: oneTapFedCM,
      },
    }),
  ],
  fetchOptions: {
    onError(e) {
      if (e.error.status === 429) {
        toast.error("Too many requests. Please try again later.");
      }
    },
  },
});

export const signInWithGithub = async (callbackUrl?: string | null) => {
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl ?? null);
  await authClient.signIn.social({
    provider: "github",
    callbackURL: safeCallbackUrl,
  });
};

export const signInWithGoogle = async (callbackUrl?: string | null) => {
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl ?? null);
  await authClient.signIn.social({
    provider: "google",
    callbackURL: safeCallbackUrl,
  });
};

export const signInWithMicrosoft = async (callbackUrl?: string | null) => {
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl ?? null);
  await authClient.signIn.social({
    provider: "microsoft",
    callbackURL: safeCallbackUrl,
  });
};

export const signInWithVercel = async (callbackUrl?: string | null) => {
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl ?? null);
  await authClient.signIn.social({
    provider: "vercel",
    callbackURL: safeCallbackUrl,
  });
};
