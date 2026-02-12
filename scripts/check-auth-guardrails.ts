import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

type GuardrailCheck = {
  id: string;
  description: string;
  pattern: string;
  targets: string[];
};

type SearchResult =
  | { kind: "ok"; matches: string }
  | { kind: "none" }
  | { kind: "error"; message: string };

const USE_RG = (() => {
  const probe = spawnSync("rg", ["--version"], { encoding: "utf8" });
  return probe.status === 0;
})();

function runSearch(pattern: string, targets: string[]): SearchResult {
  const existingTargets = targets.filter((target) => existsSync(target));
  if (existingTargets.length === 0) {
    return { kind: "none" };
  }

  const command = USE_RG ? "rg" : "grep";
  const args = USE_RG
    ? ["-n", pattern, ...existingTargets]
    : ["-R", "-nE", pattern, ...existingTargets];

  const result = spawnSync(command, args, {
    encoding: "utf8",
  });

  if (result.status === 0) {
    return { kind: "ok", matches: result.stdout.trim() };
  }

  if (result.status === 1) {
    return { kind: "none" };
  }

  return {
    kind: "error",
    message: `${command} exited with code ${result.status ?? "unknown"}: ${
      (result.stderr || result.stdout || "").trim() || "no output"
    }`,
  };
}

const checks: GuardrailCheck[] = [
  {
    id: "BA-002",
    description:
      "No direct DB imports in user-facing auth/session/account flows",
    pattern: "@/db|@/db/schema|drizzle-orm",
    targets: [
      "src/app/dashboard/user-account",
      "src/app/dashboard/user-profile",
      "src/app/dashboard/user-session",
      "src/data/user",
    ],
  },
  {
    id: "BA-003",
    description: "No admin client usage in user-facing flows",
    pattern: "authAdminClient|authClient\\.admin\\.",
    targets: [
      "src/app/dashboard/user-account",
      "src/app/dashboard/user-profile",
      "src/app/dashboard/user-session",
      "src/data/user",
    ],
  },
  {
    id: "BA-003",
    description: "auth-client must not register adminClient plugin",
    pattern: "adminClient\\(",
    targets: ["src/lib/auth-client.ts"],
  },
];

const violations: Array<{
  check: GuardrailCheck;
  details: string;
}> = [];

for (const check of checks) {
  const result = runSearch(check.pattern, check.targets);
  if (result.kind === "error") {
    console.error(`[auth-guardrails] ${check.id} ${check.description}`);
    console.error(result.message);
    process.exit(1);
  }

  if (result.kind === "ok") {
    violations.push({ check, details: result.matches });
  }
}

if (violations.length > 0) {
  console.error("[auth-guardrails] Guardrail violations found:");
  for (const violation of violations) {
    console.error(`\n- ${violation.check.id}: ${violation.check.description}`);
    console.error(violation.details);
  }
  process.exit(1);
}

console.log(
  "[auth-guardrails] PASS: no policy violations in user-facing auth/session/account flows.",
);
