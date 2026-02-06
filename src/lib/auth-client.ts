import { createAuthClient } from "better-auth/react";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import {
  adminClient,
  customSessionClient,
  organizationClient,
  twoFactorClient,
  multiSessionClient,
  deviceAuthorizationClient,
  lastLoginMethodClient,
  oneTapClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { stripeClient } from "@better-auth/stripe/client";
import { toast } from "sonner";
import { ac } from "@/lib/built-in-organization-role-permissions";
import type { auth } from "@/lib/auth";

const enableStripe = process.env.NEXT_PUBLIC_BETTER_AUTH_ENABLE_STRIPE === "true";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
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
    passkeyClient(),
    oauthProviderClient(),
    ...(enableStripe
      ? [
          stripeClient({
            subscription: true,
          }),
        ]
      : []),
    customSessionClient<typeof auth>(),
    oneTapClient({
      clientId:
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID ||
        "",
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
