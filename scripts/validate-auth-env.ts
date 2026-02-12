import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type EnvMap = Map<string, string>;

type PairRule = {
  id: string;
  provider: string;
  clientIdKeys: string[];
  clientSecretKeys: string[];
  allowClientIdWithoutSecret?: boolean;
};

function parseEnvFile(filePath: string): EnvMap {
  const parsed = new Map<string, string>();
  const raw = readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed.set(key, value);
  }

  return parsed;
}

function firstNonEmpty(env: EnvMap, keys: string[]): string | null {
  for (const key of keys) {
    const value = env.get(key)?.trim() ?? "";
    if (value.length > 0) {
      return value;
    }
  }
  return null;
}

function main() {
  const rawArgs = process.argv.slice(2).map((arg) => arg.trim()).filter(Boolean);
  const targetArg = rawArgs.find((arg) => arg !== "--");
  const targetPath = targetArg
    ? path.resolve(process.cwd(), targetArg)
    : path.resolve(process.cwd(), ".env.example");

  if (!existsSync(targetPath)) {
    console.error(`[auth-env-check] env file not found: ${targetPath}`);
    process.exit(1);
  }

  const env = parseEnvFile(targetPath);
  const errors: string[] = [];
  const warnings: string[] = [];

  const secondaryStorage = env.get("BETTER_AUTH_SECONDARY_STORAGE")?.trim() ?? "";
  const rateLimitStorage = env.get("BETTER_AUTH_RATE_LIMIT_STORAGE")?.trim() ?? "";

  if (
    secondaryStorage.length > 0 &&
    secondaryStorage !== "memory" &&
    secondaryStorage !== "upstash-redis"
  ) {
    errors.push(
      "BETTER_AUTH_SECONDARY_STORAGE must be one of: memory, upstash-redis.",
    );
  }

  if (secondaryStorage === "upstash-redis") {
    const redisUrl = env.get("UPSTASH_REDIS_REST_URL")?.trim() ?? "";
    const redisToken = env.get("UPSTASH_REDIS_REST_TOKEN")?.trim() ?? "";
    if (!redisUrl || !redisToken) {
      errors.push(
        "BETTER_AUTH_SECONDARY_STORAGE=upstash-redis requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      );
    }
  }

  if (rateLimitStorage === "secondary-storage" && !secondaryStorage) {
    errors.push(
      "BETTER_AUTH_RATE_LIMIT_STORAGE=secondary-storage requires BETTER_AUTH_SECONDARY_STORAGE to be configured.",
    );
  }

  const databaseUrl = env.get("DATABASE_URL")?.trim() ?? "";
  if (!databaseUrl) {
    errors.push("DATABASE_URL is required for Better Auth + Drizzle runtime.");
  }

  const oauthPairs: PairRule[] = [
    {
      id: "OAUTH_GITHUB",
      provider: "GitHub",
      clientIdKeys: ["GITHUB_CLIENT_ID"],
      clientSecretKeys: ["GITHUB_CLIENT_SECRET"],
    },
    {
      id: "OAUTH_GOOGLE",
      provider: "Google",
      clientIdKeys: ["GOOGLE_CLIENT_ID", "NEXT_PUBLIC_GOOGLE_CLIENT_ID"],
      clientSecretKeys: ["GOOGLE_CLIENT_SECRET"],
      allowClientIdWithoutSecret: true,
    },
    {
      id: "OAUTH_FACEBOOK",
      provider: "Facebook",
      clientIdKeys: ["FACEBOOK_CLIENT_ID"],
      clientSecretKeys: ["FACEBOOK_CLIENT_SECRET"],
    },
    {
      id: "OAUTH_DISCORD",
      provider: "Discord",
      clientIdKeys: ["DISCORD_CLIENT_ID"],
      clientSecretKeys: ["DISCORD_CLIENT_SECRET"],
    },
    {
      id: "OAUTH_MICROSOFT",
      provider: "Microsoft",
      clientIdKeys: ["MICROSOFT_CLIENT_ID"],
      clientSecretKeys: ["MICROSOFT_CLIENT_SECRET"],
    },
    {
      id: "OAUTH_TWITCH",
      provider: "Twitch",
      clientIdKeys: ["TWITCH_CLIENT_ID"],
      clientSecretKeys: ["TWITCH_CLIENT_SECRET"],
    },
    {
      id: "OAUTH_TWITTER",
      provider: "Twitter",
      clientIdKeys: ["TWITTER_CLIENT_ID"],
      clientSecretKeys: ["TWITTER_CLIENT_SECRET"],
    },
    {
      id: "OAUTH_PAYPAL",
      provider: "PayPal",
      clientIdKeys: ["PAYPAL_CLIENT_ID"],
      clientSecretKeys: ["PAYPAL_CLIENT_SECRET"],
    },
    {
      id: "OAUTH_VERCEL",
      provider: "Vercel",
      clientIdKeys: ["VERCEL_CLIENT_ID"],
      clientSecretKeys: ["VERCEL_CLIENT_SECRET"],
    },
  ];

  for (const pair of oauthPairs) {
    const clientId = firstNonEmpty(env, pair.clientIdKeys);
    const clientSecret = firstNonEmpty(env, pair.clientSecretKeys);

    if (clientId && !clientSecret) {
      if (pair.allowClientIdWithoutSecret) {
        warnings.push(
          `${pair.id}: ${pair.provider} clientId is set but clientSecret is missing. This is acceptable for One Tap only; social sign-in remains disabled.`,
        );
      } else {
        errors.push(
          `${pair.id}: ${pair.provider} requires both clientId and clientSecret when enabled.`,
        );
      }
    }

    if (!clientId && clientSecret) {
      errors.push(
        `${pair.id}: ${pair.provider} clientSecret is set but clientId is missing.`,
      );
    }
  }

  if (warnings.length > 0) {
    console.warn("[auth-env-check] warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error("[auth-env-check] failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`[auth-env-check] PASS: ${path.basename(targetPath)} is valid.`);
}

main();
