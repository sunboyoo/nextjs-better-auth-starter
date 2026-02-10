"use client";

import { useSyncExternalStore } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { LastUsedIndicator } from "@/components/last-used-indicator";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "microsoft", label: "Microsoft" },
  { id: "vercel", label: "Vercel" },
] as const;

type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]["id"];

interface SocialSignInButtonsProps {
  callbackURL: string;
  params: ReadonlyURLSearchParams;
  className?: string;
}

export function SocialSignInButtons({
  callbackURL,
  params,
  className,
}: SocialSignInButtonsProps) {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const requestQuery = Object.fromEntries(params.entries());

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {SOCIAL_PROVIDERS.map((provider) => (
        <Button
          key={provider.id}
          variant="outline"
          className="relative"
          onClick={async () => {
            await authClient.signIn.social({
              provider: provider.id,
              callbackURL,
              fetchOptions: {
                query: requestQuery,
              },
            });
          }}
          aria-label={`Sign in with ${provider.label}`}
          type="button"
        >
          {provider.label}
          {isMounted &&
            authClient.isLastUsedLoginMethod(provider.id as SocialProvider) && (
              <LastUsedIndicator />
            )}
        </Button>
      ))}
    </div>
  );
}
