"use client";

import { AlertTriangle } from "lucide-react";
import {
  Turnstile,
  type TurnstileInstance,
} from "@marsidev/react-turnstile";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { getCaptchaProvider, getCaptchaSiteKey, isCaptchaEnabled } from "@/lib/captcha";

export interface CaptchaFieldHandle {
  execute: () => Promise<string | null>;
  reset: () => void;
}

interface CaptchaFieldProps {
  onTokenChange?: (token: string | null) => void;
}

export const CaptchaField = forwardRef<CaptchaFieldHandle, CaptchaFieldProps>(
  function CaptchaField({ onTokenChange }, ref) {
    const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
    const widgetLoadedRef = useRef(false);

    const waitForWidgetLoad = useCallback(async (): Promise<boolean> => {
      const timeoutAt = Date.now() + 30_000;
      while (!widgetLoadedRef.current && Date.now() < timeoutAt) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 50);
        });
      }

      return widgetLoadedRef.current;
    }, []);

    const execute = useCallback(async (): Promise<string | null> => {
      if (!isCaptchaEnabled()) return null;
      const widgetLoaded = await waitForWidgetLoad();
      if (!widgetLoaded) return null;
      if (!turnstileRef.current) return null;

      onTokenChange?.(null);
      turnstileRef.current.reset();
      turnstileRef.current.execute();

      try {
        const token = await turnstileRef.current.getResponsePromise(60_000, 200);
        onTokenChange?.(token);
        return token;
      } catch {
        onTokenChange?.(null);
        return null;
      }
    }, [onTokenChange, waitForWidgetLoad]);

    const reset = useCallback((): void => {
      onTokenChange?.(null);
      turnstileRef.current?.reset();
    }, [onTokenChange]);

    useImperativeHandle(
      ref,
      () => ({
        execute,
        reset,
      }),
      [execute, reset],
    );

    if (!isCaptchaEnabled()) {
      return null;
    }

    const provider = getCaptchaProvider();
    const siteKey = getCaptchaSiteKey();

    if (provider !== "cloudflare-turnstile") {
      return (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Captcha provider &quot;{provider}&quot; is enabled, but this UI currently
          supports Cloudflare Turnstile only.
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
      <div className="w-full overflow-visible p-px">
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          onWidgetLoad={() => {
            widgetLoadedRef.current = true;
          }}
          options={{
            theme: "auto",
            size: "flexible",
            execution: "execute",
            appearance: "execute",
          }}
          onSuccess={(token) => onTokenChange?.(token)}
          onExpire={() => onTokenChange?.(null)}
          onError={() => onTokenChange?.(null)}
        />
      </div>
    );
  },
);
