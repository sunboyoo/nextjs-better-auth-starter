import { createAuthClient } from "better-auth/react";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { ac, member, admin, owner } from "@/lib/built-in-organization-role-permissions";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    organizationClient({
      ac,
      dynamicAccessControl: {
        enabled: true,
      },
    }),
  ],
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
