# Better Auth Access Policy (MUST)

Status: Active  
Last updated: 2026-02-12

This policy defines mandatory access boundaries for user-facing auth/session/account code.
If there is any ambiguity, apply the stricter interpretation.

## 1. Source Of Truth

1. Official Better Auth documentation reference is tracked in `docs/better-auth/llms.txt`.
2. Project-level enforcement context:
- `AGENTS.md`
- `docs/SERVER_CLIENT_SEPARATION.md`
3. For database schema decisions, `src/db/schema.ts` remains the single source of truth.

## 2. Scope

This policy applies to:
1. `src/app/dashboard/user-account/**`
2. `src/app/dashboard/user-profile/**`
3. `src/app/dashboard/user-session/**` (if present now or added later)
4. `src/data/user/**`
5. `src/lib/auth-client.ts`
6. `src/lib/auth-admin-client.ts`
7. Any new user-facing dashboard route that reads or mutates auth/session/account data.

## 3. Mandatory Rules

### BA-001: API-First Access For User Flows
User-facing auth/session/account features MUST use Better Auth APIs.
1. Server side: `auth.api.*`
2. Client side: `authClient.*`

### BA-002: No Direct DB Access For User Auth/Session/Account Flows
In-scope user-facing code MUST NOT directly query Better Auth auth/session/account tables.
Forbidden imports/usages in those flows:
1. `@/db`
2. `@/db/schema`
3. `drizzle-orm`

### BA-003: Least-Privilege Client Boundary
1. `src/lib/auth-client.ts` MUST NOT include `adminClient()`.
2. User-facing dashboard code MUST NOT call `authClient.admin.*`.
3. User-facing dashboard code MUST NOT import `authAdminClient`.

### BA-004: Admin Capability Isolation
1. Admin plugin usage is isolated to `src/lib/auth-admin-client.ts`.
2. Privileged operations MUST run server-side with explicit authorization checks.
3. User UI may trigger privileged actions only through server endpoints/actions that enforce authorization.

### BA-005: Session Management Through Better Auth
Session operations MUST use Better Auth APIs instead of ad-hoc SQL in user-facing auth flows.
1. Read/list: `getSession`, `listSessions` (or equivalent Better Auth APIs).
2. Revoke: `revokeSession`, `revokeOtherSessions`, `revokeSessions`, or approved server-side admin routes.

### BA-006: No Secret Leakage
Service/admin credentials MUST NOT be exposed to browser-executable code.

## 4. Allowed And Forbidden Patterns

Allowed examples:
1. Server component/action calls `auth.api.getSession`, `auth.api.listSessions`.
2. Client component calls `authClient.revokeSession` or project mutation wrappers under `src/data/user/**`.
3. Privileged management action goes through `/api/admin/*` with guard checks.

Forbidden examples:
1. User dashboard component imports `@/db` to query session/account/user auth tables directly.
2. User dashboard component imports `authAdminClient`.
3. User-facing code calls `authClient.admin.*`.
4. Adding `adminClient()` plugin to `src/lib/auth-client.ts`.

## 5. Exception Process (Strict)

If a required behavior is not supported by current Better Auth APIs:
1. Document the exact gap and impacted feature.
2. Propose a server-side fallback that preserves least privilege.
3. Add explicit authorization checks and security rationale.
4. Record the exception in the PR description and link to this policy section.
5. Prefer temporary exceptions with a follow-up task to return to pure Better Auth API usage.

No exception may expose admin/service credentials to client code.

## 6. Review Checklist (Merge Gate)

Before merging auth/session/account changes, verify:
1. In-scope user-facing files have no forbidden DB imports.
2. No `authClient.admin.*` usage in user-facing code.
3. `src/lib/auth-client.ts` does not include `adminClient()`.
4. Privileged actions are server-side and explicitly authorized.
5. Changes are implemented through Better Auth APIs where applicable.

## 7. Quick Validation Commands

```bash
# 1) No direct DB imports in user-facing account/profile data flows
rg -n "@/db|@/db/schema|drizzle-orm" \
  src/app/dashboard/user-account \
  src/app/dashboard/user-profile \
  src/data/user

# 2) No admin client usage in user-facing flows
rg -n "authAdminClient|authClient\\.admin\\." \
  src/app/dashboard/user-account \
  src/app/dashboard/user-profile \
  src/data/user

# 3) auth-client must not include adminClient plugin
rg -n "adminClient\\(" src/lib/auth-client.ts
```

Expected: no output (or intentionally documented exceptions only).
