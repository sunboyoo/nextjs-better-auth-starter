# Better Auth Access Policy (MUST)

This policy defines non-negotiable access boundaries for authentication and session code.

## Scope

This policy applies to:
- `src/app/dashboard/user-account/**`
- `src/app/dashboard/user-profile/**`
- `src/app/dashboard/user-session/**` (if present now or added later)
- `src/data/user/**`
- `src/lib/auth-client.ts`
- `src/lib/auth-admin-client.ts`
- Any new user-facing dashboard route that reads or mutates auth/session/account data

## Rules

1. User-facing auth/session/account features MUST use Better Auth APIs.
- Server usage: `auth.api.*`
- Client usage: `authClient.*`

2. User-facing dashboard code MUST NOT directly query Better Auth tables.
- Forbidden imports/usages:
- `@/db`
- `@/db/schema`
- `drizzle-orm`

3. Least-privilege client boundary is mandatory.
- `src/lib/auth-client.ts` MUST NOT include `adminClient()`.
- User-facing dashboard code MUST NOT call `authClient.admin.*`.
- User-facing dashboard code MUST NOT import `authAdminClient`.

4. Admin capability isolation is mandatory.
- Admin plugin usage is isolated to `src/lib/auth-admin-client.ts`.
- Admin operations MUST run server-side and enforce admin authorization.
- If user UI triggers privileged flow (for example stop impersonation), call a server action using `auth.api.*` and server-side session checks.

5. Session management should use Better Auth session endpoints, not SQL.
- Read/list sessions with Better Auth APIs (`getSession`, `listSessions`).
- Revoke sessions with Better Auth APIs (`revokeSession`, `revokeOtherSessions`, `revokeSessions`, or server-side admin endpoints where appropriate).

6. Secrets and privileged credentials MUST NOT be exposed to client code.
- Never place service/admin credentials in browser-accessible code.

## Implementation Guidance

- User page loads should fetch session/account data via `auth.api` in server components/actions.
- Client interactions should call `authClient` methods or server actions, not direct DB.
- Keep admin-only operations in admin routes/actions and admin-scoped modules.

## Review Checklist

Before merging auth/session changes, verify:
- No forbidden DB imports in in-scope user-facing files.
- No `authClient.admin.*` usage in user-facing files.
- `auth-client.ts` contains no `adminClient()`.
- Required behavior is implemented through Better Auth APIs.

