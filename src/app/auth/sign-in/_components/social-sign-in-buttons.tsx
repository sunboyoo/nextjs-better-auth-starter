"use client";

import { useSyncExternalStore } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import {
  GithubIcon,
  GoogleIcon,
  MicrosoftIcon,
  VercelIcon,
} from "@/components/ui/icons";
import { LastUsedIndicator } from "@/components/last-used-indicator";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const subscribe = () => () => { };

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google", icon: GoogleIcon },
  { id: "github", label: "GitHub", icon: GithubIcon },
  { id: "microsoft", label: "Microsoft", icon: MicrosoftIcon },
  { id: "vercel", label: "Vercel", icon: VercelIcon },
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
          <provider.icon className="mr-2 h-4 w-4" />
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
