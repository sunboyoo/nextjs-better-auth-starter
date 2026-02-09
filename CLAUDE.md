# Claude Instructions

## Mandatory Better Auth Policy

You MUST follow:
- `docs/policies/better-auth-access-policy.md`

If there is any ambiguity, choose the stricter interpretation of the policy.

## Auth/Session Guardrails

For user-facing dashboard auth/session/account code:
- Use Better Auth APIs (`auth.api.*` on server, `authClient.*` on client).
- Do not use direct DB access to auth tables.
- Do not use admin client calls in user-facing flows.

For admin capabilities:
- Keep admin plugin usage isolated to `src/lib/auth-admin-client.ts`.
- Execute privileged operations server-side with explicit authorization checks.

## Database Schema Source of Truth

`src/db/schema.ts` is the single source of truth for database schema design and changes.

## Output Requirement

When proposing or applying auth/session/account changes, include:
- Policy rules applied.
- Files changed.
- Confirmation that no forbidden patterns were introduced.
