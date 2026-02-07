import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { BASE_ERROR_CODES } from "@better-auth/core/error";
import { SocialProviderListEnum } from "@better-auth/core/social-providers";
import { base64Url } from "@better-auth/utils/base64";
import { createHash } from "@better-auth/utils/hash";
import { betterFetch } from "@better-fetch/fetch";
import {
  APIError,
  defineErrorCodes,
  type BetterAuthPlugin,
  safeJSONParse,
} from "better-auth";
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput, type User } from "better-auth/db";
import * as z from "zod";
import type { ElectronOptions } from "./types";

const ELECTRON_ERROR_CODES = defineErrorCodes({
  INVALID_TOKEN: "Invalid or expired token.",
  STATE_MISMATCH: "state mismatch",
  MISSING_CODE_CHALLENGE: "missing code challenge",
  INVALID_CODE_VERIFIER: "Invalid code verifier",
  MISSING_STATE: "state is required",
  MISSING_PKCE: "pkce is required",
});

const electronTokenBodySchema = z.object({
  token: z.string().nonempty(),
  state: z.string().nonempty(),
  code_verifier: z.string().nonempty(),
});

const electronInitOAuthProxyQuerySchema = z.object({
  provider: z.string().nonempty(),
  state: z.string(),
  code_challenge: z.string(),
  code_challenge_method: z.string().optional(),
});

function apiError(status: string, message: string): APIError {
  return new APIError(status as any, { message });
}

function electronToken() {
  return createAuthEndpoint(
    "/electron/token",
    {
      method: "POST",
      body: electronTokenBodySchema,
      metadata: {
        scope: "http",
      },
    },
    async (ctx: any) => {
      const token = await ctx.context.internalAdapter.findVerificationValue(
        `electron:${ctx.body.token}`,
      );
      if (!token || token.expiresAt < new Date()) {
        throw apiError("NOT_FOUND", ELECTRON_ERROR_CODES.INVALID_TOKEN);
      }

      const tokenRecord = safeJSONParse<Record<string, unknown>>(token.value);
      if (!tokenRecord) {
        throw apiError("INTERNAL_SERVER_ERROR", ELECTRON_ERROR_CODES.INVALID_TOKEN);
      }

      if (tokenRecord.state !== ctx.body.state) {
        throw apiError("BAD_REQUEST", ELECTRON_ERROR_CODES.STATE_MISMATCH);
      }

      if (!tokenRecord.codeChallenge) {
        throw apiError("BAD_REQUEST", ELECTRON_ERROR_CODES.MISSING_CODE_CHALLENGE);
      }

      if (tokenRecord.codeChallengeMethod === "s256") {
        const codeChallenge = Buffer.from(
          base64Url.decode(String(tokenRecord.codeChallenge)),
        );
        const codeVerifier = Buffer.from(
          await createHash("SHA-256").digest(ctx.body.code_verifier),
        );

        if (
          codeChallenge.length !== codeVerifier.length ||
          !timingSafeEqual(codeChallenge, codeVerifier)
        ) {
          throw apiError("BAD_REQUEST", ELECTRON_ERROR_CODES.INVALID_CODE_VERIFIER);
        }
      } else if (tokenRecord.codeChallenge !== ctx.body.code_verifier) {
        throw apiError("BAD_REQUEST", ELECTRON_ERROR_CODES.INVALID_CODE_VERIFIER);
      }

      await ctx.context.internalAdapter.deleteVerificationValue(token.id);

      const user = await ctx.context.internalAdapter.findUserById(
        tokenRecord.userId,
      );
      if (!user) {
        throw apiError("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.USER_NOT_FOUND);
      }

      const session = await ctx.context.internalAdapter.createSession(user.id);
      if (!session) {
        throw apiError(
          "INTERNAL_SERVER_ERROR",
          BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION,
        );
      }

      await setSessionCookie(ctx, {
        session,
        user,
      });

      return ctx.json({
        token: session.token,
        user: parseUserOutput(ctx.context.options, user) as User &
          Record<string, unknown>,
      });
    },
  );
}

function electronInitOAuthProxy(options: Required<ElectronOptions>) {
  return createAuthEndpoint(
    "/electron/init-oauth-proxy",
    {
      method: "GET",
      query: electronInitOAuthProxyQuerySchema,
      metadata: {
        scope: "http",
      },
    },
    async (ctx: any) => {
      const isSocialProvider = SocialProviderListEnum.safeParse(ctx.query.provider);
      if (!isSocialProvider.success && !ctx.context.getPlugin("generic-oauth")) {
        throw apiError("BAD_REQUEST", BASE_ERROR_CODES.PROVIDER_NOT_FOUND);
      }

      const headers = new Headers(ctx.request?.headers);
      headers.set("origin", new URL(ctx.context.baseURL).origin);

      let setCookie: string | null = null;
      const searchParams = new URLSearchParams();
      searchParams.set("client_id", options.clientID || "electron");
      searchParams.set("code_challenge", ctx.query.code_challenge);
      searchParams.set(
        "code_challenge_method",
        ctx.query.code_challenge_method || "plain",
      );
      searchParams.set("state", ctx.query.state);

      const res = await betterFetch<{
        url: string | undefined;
        redirect: boolean;
        user?: User & Record<string, unknown>;
        token?: string;
      }>(
        `${isSocialProvider.success ? "/sign-in/social" : "/sign-in/oauth2"}?${searchParams.toString()}`,
        {
          baseURL: ctx.context.baseURL,
          method: "POST",
          body: {
            provider: ctx.query.provider,
            disableRedirect: true,
          },
          onResponse: (fetchCtx) => {
            setCookie = fetchCtx.response.headers.get("set-cookie") ?? null;
          },
          headers,
        },
      );

      if (res.error) {
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: res.error.message || "An unknown error occurred.",
        });
      }

      if (setCookie) {
        ctx.setHeader("set-cookie", setCookie);
      }

      if (res.data?.url) {
        ctx.setHeader("Location", res.data.url);
        ctx.setStatus(302);
        return;
      }

      return ctx.json(res.data);
    },
  );
}

function isElectronAuthPath(path?: string | undefined): boolean {
  if (!path) return false;

  return Boolean(
    path.startsWith("/sign-in") ||
      path.startsWith("/sign-up") ||
      path.startsWith("/callback") ||
      path.startsWith("/oauth2/callback") ||
      path.startsWith("/magic-link/verify") ||
      path.startsWith("/email-otp/verify-email") ||
      path.startsWith("/verify-email") ||
      path.startsWith("/one-tap/callback") ||
      path.startsWith("/passkey/verify-authentication") ||
      path.startsWith("/phone-number/verify"),
  );
}

export const electron = (options?: ElectronOptions | undefined) => {
  const opts: Required<ElectronOptions> = {
    codeExpiresIn: 300,
    redirectCookieExpiresIn: 120,
    cookiePrefix: "better-auth",
    clientID: "electron",
    disableOriginOverride: false,
    ...(options || {}),
  };

  return {
    id: "electron",
    async onRequest(request: Request) {
      if (opts.disableOriginOverride || request.headers.get("origin")) {
        return;
      }

      const electronOrigin = request.headers.get("electron-origin");
      if (!electronOrigin) {
        return;
      }

      const req = request.clone();
      req.headers.set("origin", electronOrigin);
      return {
        request: req,
      };
    },
    hooks: {
      after: [
        {
          matcher: (ctx: any) => !isElectronAuthPath(ctx.path),
          handler: createAuthMiddleware(async (ctx: any) => {
            const transferCookie = await ctx.getSignedCookie(
              `${opts.cookiePrefix}.transfer_token`,
              ctx.context.secret,
            );
            if (!ctx.context.newSession?.session || !transferCookie) {
              return;
            }

            const cookie = ctx.context.createAuthCookie("transfer_token", {
              maxAge: opts.codeExpiresIn,
            });

            await ctx.setSignedCookie(
              cookie.name,
              transferCookie,
              ctx.context.secret,
              cookie.attributes,
            );
          }),
        },
        {
          matcher: (ctx: any) => isElectronAuthPath(ctx.path),
          handler: createAuthMiddleware(async (ctx: any) => {
            const querySchema = z.object({
              client_id: z.string(),
              code_challenge: z.string().nonempty(),
              code_challenge_method: z.string().optional().default("plain"),
              state: z.string().nonempty(),
            });

            const cookie = ctx.context.createAuthCookie("transfer_token", {
              maxAge: opts.codeExpiresIn,
            });

            if (
              ctx.query?.client_id === opts.clientID &&
              (ctx.path.startsWith("/sign-in") || ctx.path.startsWith("/sign-up"))
            ) {
              const query = querySchema.safeParse(ctx.query);
              if (query.success) {
                await ctx.setSignedCookie(
                  cookie.name,
                  JSON.stringify(query.data),
                  ctx.context.secret,
                  cookie.attributes,
                );
              }
            }

            if (!ctx.context.newSession?.session) {
              return;
            }

            const transferCookie = await ctx.getSignedCookie(
              cookie.name,
              ctx.context.secret,
            );
            ctx.setCookie(cookie.name, "", {
              ...cookie.attributes,
              maxAge: 0,
            });

            let transferPayload: z.infer<typeof querySchema> | null = null;
            if (transferCookie) {
              transferPayload = safeJSONParse(transferCookie);
            } else {
              const query = querySchema.safeParse(ctx.query);
              if (query.success) {
                transferPayload = query.data;
              }
            }

            if (!transferPayload) {
              return;
            }

            const { client_id, code_challenge, code_challenge_method, state } =
              transferPayload;

            if (client_id !== opts.clientID) {
              return;
            }
            if (!state) {
              throw apiError("BAD_REQUEST", ELECTRON_ERROR_CODES.MISSING_STATE);
            }
            if (!code_challenge) {
              throw apiError("BAD_REQUEST", ELECTRON_ERROR_CODES.MISSING_PKCE);
            }

            const redirectCookieName = `${opts.cookiePrefix}.${opts.clientID}`;
            const identifier = [...crypto.getRandomValues(new Uint8Array(24))]
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");

            const codeExpiresInMs = opts.codeExpiresIn * 1000;
            const expiresAt = new Date(Date.now() + codeExpiresInMs);
            await ctx.context.internalAdapter.createVerificationValue({
              identifier: `electron:${identifier}`,
              value: JSON.stringify({
                userId: ctx.context.newSession.user.id,
                codeChallenge: code_challenge,
                codeChallengeMethod: code_challenge_method.toLowerCase(),
                state,
              }),
              expiresAt,
            });

            ctx.setCookie(redirectCookieName, identifier, {
              ...ctx.context.authCookies.sessionToken.attributes,
              maxAge: opts.redirectCookieExpiresIn,
              httpOnly: false,
            });

            return ctx;
          }),
        },
      ],
    },
    endpoints: {
      electronToken: electronToken(),
      electronInitOAuthProxy: electronInitOAuthProxy(opts),
    },
    options: opts,
    $ERROR_CODES: ELECTRON_ERROR_CODES,
  } satisfies BetterAuthPlugin;
};
