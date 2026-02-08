"use client";

import { AlertTriangle } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { getCaptchaProvider, getCaptchaSiteKey, isCaptchaEnabled } from "@/lib/captcha";

interface CaptchaFieldProps {
  widgetKey: number;
  onTokenChange: (token: string | null) => void;
}

export function CaptchaField({ widgetKey, onTokenChange }: CaptchaFieldProps) {
  if (!isCaptchaEnabled()) {
    return null;
  }

  const provider = getCaptchaProvider();
  const siteKey = getCaptchaSiteKey();

  if (provider !== "cloudflare-turnstile") {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
        Captcha provider &quot;{provider}&quot; is enabled, but this UI currently supports
        Cloudflare Turnstile only.
      </div>
    );
  }

  if (!siteKey) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Captcha is enabled, but `NEXT_PUBLIC_BETTER_AUTH_CAPTCHA_SITE_KEY` is
            missing.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-xs text-muted-foreground">
        Complete captcha verification before submitting.
      </p>
      <Turnstile
        key={widgetKey}
        siteKey={siteKey}
        options={{
          theme: "auto",
          size: "flexible",
        }}
        onSuccess={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
      />
    </div>
  );
}
