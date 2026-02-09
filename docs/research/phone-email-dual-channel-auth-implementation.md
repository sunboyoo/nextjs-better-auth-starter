# Phone + Email Dual-Channel Auth Implementation

## Scope

This document records implementation work completed from the strategy in:

- `docs/research/phone-email-dual-channel-auth-strategy.md`

Goal: operationalize phone-first + email-first auth with Better Auth, while safely handling synthetic email addresses required by phone-first signup compatibility.

## Reservations Addressed

The following strategic reservations were implemented in code:

1. Distinguish synthetic vs user-provided email explicitly.
2. Prevent email-based auth/recovery flows for synthetic emails.
3. Make channel behavior capability-driven in UI and API handling.
4. Provide first-class phone-first signup, not only email-first signup.
5. Keep phone-number updates OTP-verified only.

## Implemented Changes

### 1. Channel Metadata Model (Persisted + Derived)

Added explicit metadata for channel capability decisions:

- `emailSource` (`synthetic | user_provided`)
- `emailDeliverable` (`boolean`)
- Runtime-derived `primaryAuthChannel` (`phone | email | mixed`)

Implementation:

- `src/db/schema.ts`
- `src/lib/auth-channel.ts`
- `src/lib/auth.ts` (`databaseHooks.user.create.before`, `databaseHooks.user.update.before`, `user.additionalFields`)
- `src/app/dashboard/user-account/page.tsx` (runtime channel derivation)

Behavior:

- Phone-first synthetic emails are marked as synthetic/non-deliverable.
- Email + phone verification status contributes to runtime `primaryAuthChannel`.
- Email normalization is centralized.

### 2. Server-Side Flow Gating for Synthetic Email

Added server protection that blocks email-based flows when the submitted/lookup email is synthetic.

Implementation:

- `src/lib/auth.ts` `hooks.before`:
  - blocks synthetic-email requests for:
    - `/sign-in/email`
    - `/sign-in/email-otp`
    - `/sign-in/magic-link`
    - `/request-password-reset`
    - `/send-verification-email`
    - `/email-otp/send-verification-otp`
    - `/email-otp/request-password-reset`
    - `/email-otp/verify-email`
  - blocks `/sign-in/username` for users whose account email is synthetic.

Also guarded message-sending paths so no outbound email is sent to synthetic addresses:

- email change confirmation
- reset password email
- verification email
- email OTP
- magic link

Implementation:

- `src/lib/auth.ts` (`user.changeEmail`, `emailAndPassword`, `emailVerification`, `emailOTP`, `magicLink`)

### 3. Protected User Verification Endpoint Guard

Added synthetic-email protection to the authenticated resend verification route.

Implementation:

- `src/app/api/user/send-verification-email/route.ts`

Behavior:

- returns `400` with channel guidance when current email is synthetic.

### 4. Phone OTP Delivery Webhook Route

Implemented an authenticated webhook endpoint to deliver phone OTP via Twilio REST API.

Implementation:

- `src/app/api/auth/webhook/phone-otp/route.ts`

Behavior:

- validates bearer token (`BETTER_AUTH_PHONE_OTP_WEBHOOK_AUTH_TOKEN`)
- validates payload (`phoneNumber`, `code`, `type`)
- forwards SMS via Twilio API credentials from server env
- returns actionable error status/messages

### 5. Sign-In UI: Identifier-Aware Channel Actions

Updated sign-in UX so channel actions are shown based on identifier type:

- Email identifier: show magic link + email OTP actions
- Phone identifier: show phone OTP actions
- Username identifier: keep username/password path, show guidance to switch identifier for OTP

Implementation:

- `src/components/forms/sign-in-form.tsx`

Behavior:

- avoids presenting irrelevant channel options for the current identifier
- resets OTP state when identifier channel changes

### 6. Phone-First Signup as First-Class Path

Added dedicated phone OTP signup form and wired it in the Sign Up tab.

Implementation:

- `src/components/forms/phone-sign-up-form.tsx` (new)
- `src/app/auth/sign-in/_components/sign-up.tsx`

Behavior:

- user sends OTP to phone
- verifies OTP
- Better Auth phone plugin handles sign-up/sign-in on verification
- users can later add a real email in account settings

### 7. Account Settings Capability UX

Extended account settings components to expose capability context and safe messaging:

- Email card now reflects synthetic status and primary auth channel
- synthetic emails show explicit guidance instead of resend-verification action
- phone card supports OTP-based phone update + verify flow

Implementation:

- `src/app/dashboard/user-account/page.tsx`
- `src/app/dashboard/user-account/_components/user-email-card.tsx`
- `src/app/dashboard/user-account/_components/user-phone-card.tsx`

### 8. Client Plugin Wiring

Ensured phone plugin client support is enabled.

Implementation:

- `src/lib/auth-client.ts` (`phoneNumberClient()`)

### 9. Greenfield Schema Hardening (No Backward-Compat Constraints)

Because this project is treated as fresh/greenfield, auth tables were tightened for stronger invariants and better query performance.

Implementation:

- `src/db/schema.ts`
- `src/lib/auth.ts` (`experimental.joins = true`)

Highlights:

- enum-backed channel metadata field (`emailSource`)
- `primaryAuthChannel` removed from DB schema and computed at runtime from channel capability
- stricter nullability defaults (`phoneNumberVerified`, `twoFactorEnabled`, `banned`, `role`, etc.)
- DB-level checks for normalized email/username and E.164 phone format
- stronger uniqueness/indexes:
  - account provider/account uniqueness
  - passkey credential uniqueness
  - one two-factor row per user
  - member uniqueness per org (`organizationId + userId`)
  - verification/session lookup indexes for hot paths

### 10. OTP Anti-Abuse Controls (Per-IP + Per-Phone)

Added explicit OTP throttles for phone OTP endpoints beyond plugin attempt caps.

Implementation:

- `src/lib/auth.ts`
- `.env.example`

Behavior:

- applies per-IP + per-phone throttles on:
  - `/phone-number/send-otp`
  - `/phone-number/verify`
  - `/phone-number/request-password-reset`
  - `/phone-number/reset-password`
- configurable limits/window via:
  - `BETTER_AUTH_PHONE_OTP_THROTTLE_ENABLED`
  - `BETTER_AUTH_PHONE_OTP_THROTTLE_WINDOW_SECONDS`
  - `BETTER_AUTH_PHONE_OTP_*_MAX_PER_IP`
  - `BETTER_AUTH_PHONE_OTP_*_MAX_PER_PHONE`

### 11. Anti-Enumeration Hardening

Standardized sensitive recovery/send responses to reduce account-state leakage.

Implementation:

- `src/components/forms/forget-password-form.tsx`
- `src/components/forms/reset-password-email-otp-form.tsx`
- `src/components/forms/reset-password-phone-otp-form.tsx`
- `src/components/forms/sign-in-form.tsx`
- `src/app/auth/forget-password/page.tsx`
- `src/lib/auth.ts` (synthetic-email path message policy)

Behavior:

- reset request flows now show generic success semantics except for explicit rate-limit errors.
- magic-link/email-OTP send paths are less enumerable from UI behavior.
- synthetic-email sign-in path uses generic credential failure semantics.

### 12. Synthetic-Email Delete Safety + Invitation Policy + Resilience Nudges

Closed deletion dead-end for phone-first synthetic-email users and documented policy UX.

Implementation:

- `src/lib/auth.ts`
- `src/app/dashboard/user-account/_components/delete-user-card.tsx`
- `src/app/dashboard/user-account/_components/auth-resilience-card.tsx`
- `src/app/dashboard/user-account/page.tsx`
- `src/components/forms/invite-member-form.tsx`

Behavior:

- synthetic-email accounts cannot run email-confirmation-only delete path without password re-auth.
- delete verification email is skipped for synthetic addresses.
- invitation creation to synthetic placeholder domains is rejected (email-only invitation policy retained).
- account page now shows resilience nudges for second-channel + passkey/password backup setup (SIM-loss mitigation guidance).

## Strategy Comparison (Audit)

This section compares current implementation to:

- `docs/research/phone-email-dual-channel-auth-strategy.md`

Status legend:

- `Implemented`: present and aligned.
- `Partial`: present but not fully aligned with strategy intent.
- `Gap`: not implemented yet.

### Core Policy Decisions

1. Sign up requires at least one of email or phone.
   - Status: `Implemented`
   - Notes: Email signup and phone OTP signup are both available.
2. At signup completion, at least one channel must be verified.
   - Status: `Partial`
   - Notes: Phone-first is verified on OTP flow; email path still creates unverified users and relies on sign-in-time verification gate.
3. Do not show/offer channel-specific auth options if user lacks that verified channel.
   - Status: `Partial`
   - Notes: Pre-auth UX now suppresses placeholder-domain email options and keeps identifier-aware gating; full verified-capability discovery pre-auth is still intentionally limited to avoid enumeration.
4. Strong safeguards for high-risk operations.
   - Status: `Partial`
   - Notes: Phone change is OTP-verified, recovery flows are captcha+throttled, and synthetic-email deletion now requires password re-auth. A stricter global step-up policy can still be added later.

### Temporary Email Strategy

- Use reserved non-deliverable domain.
  - Status: `Implemented`
- Mark synthetic email explicitly.
  - Status: `Implemented`
- Store explicit persisted metadata (`emailSource`, `emailDeliverable`) and compute `primaryAuthChannel` at runtime.
  - Status: `Implemented`
- Never send magic link/email OTP to synthetic addresses.
  - Status: `Implemented`
- Prompt phone-first users to add real email.
  - Status: `Implemented`
  - Notes: Guidance exists in account email card and account resilience card.

### Channel-Specific UX Policy

- Phone-only users should use phone OTP login/recovery and avoid email OTP/magic link.
  - Status: `Partial`
  - Notes: Server blocks synthetic-email email flows, and sign-in suppresses placeholder-domain email options. Full capability discovery pre-auth remains intentionally limited.
- Email-only users should fully function without phone.
  - Status: `Implemented`
- Mixed users can use both and are encouraged to set backup auth.
  - Status: `Implemented`
  - Notes: Account resilience card now nudges backup factor setup (second channel, passkey, password).

### Recovery and Security Best Practices

1. E.164 normalization and validation.
   - Status: `Implemented`
2. Strict rate limits per phone and per IP on OTP endpoints.
   - Status: `Implemented`
3. OTP expiry and attempt caps.
   - Status: `Implemented`
4. Anti-enumeration responses on signup/recovery.
   - Status: `Partial`
   - Notes: Recovery and OTP-send UI flows were normalized; further endpoint-level standardization is still possible.
5. Phone updates require verified OTP flow.
   - Status: `Implemented`
6. SIM-swap mitigation (passkeys + backup recovery policy).
   - Status: `Partial`
   - Notes: Passkey/backup-factor nudges are implemented, but a formal support recovery runbook is still needed.

### Phased Rollout Plan

1. Foundation.
   - Status: `Implemented`
   - Notes: Capability metadata model, synthetic-email policy, and OTP anti-abuse controls are in place.
2. Dual-channel signup/signin.
   - Status: `Implemented`
3. Account settings and linking.
   - Status: `Partial`
   - Notes: Email/phone update flows exist; synthetic-email invite policy is enforced as email-only. Phone-based invite acceptance is intentionally not implemented.
4. Hardening.
   - Status: `Partial`
   - Notes: Passkey + anti-abuse controls are in place; dashboards/alerts and support runbook remain.
5. Migration and cleanup.
   - Status: `Not Applicable (Greenfield)` for backfill; support tooling still pending.

### Recommended Default Policy

- Keep both phone-first and email-first signup paths.
  - Status: `Implemented`
- Require one verified channel to activate account.
  - Status: `Partial`
  - Notes: Enforced effectively for sign-in; not modeled as a separate activation state.
- Synthetic email only as compatibility bridge.
  - Status: `Implemented`
- Track synthetic vs real email explicitly.
  - Status: `Implemented`
- Do not expose email-based login/recovery to synthetic-email users.
  - Status: `Implemented`
  - Notes: Server blocks are in place; pre-auth UI also suppresses placeholder-domain email actions.
- Encourage second verified channel over time.
  - Status: `Implemented`
  - Notes: Account resilience card provides persistent backup-factor guidance.

### Open Questions Status

1. Should org invitations remain email-only or support phone-based acceptance?
   - Status: `Resolved (Current Policy)`
   - Current state: invitations remain email-only and synthetic placeholder addresses are rejected.
2. For phone-only users, what is recovery if SIM is lost?
   - Status: `Partial`
   - Current state: product nudges passkeys/backup factors, but an explicit support runbook is still missing.
3. Which SMS regions/providers are in scope first?
   - Status: `Unresolved`
   - Current state: webhook/Twilio integration is implemented, but rollout/compliance scope is undefined.
4. Which fraud controls are launch-critical vs post-launch?
   - Status: `Partial`
   - Current state: captcha + endpoint throttles + OTP attempt caps are enforced; advanced anomaly alerting policy is still pending.

## Identified Gaps (Prioritized)

1. **Capability-aware pre-auth remains intentionally limited**
   - Full verified-capability discovery pre-auth is not implemented to avoid enumeration risk.
2. **Anti-enumeration standardization is partial**
   - Core recovery/send flows are normalized, but endpoint-level semantics could still be unified further.
3. **SIM-loss support policy is not fully operationalized**
   - Product nudges exist, but support runbook and escalation process are not documented.
4. **Operational monitoring/alerting is still lightweight**
   - Structured logs exist, but dashboards and alert thresholds are not yet configured.

## Validation

Validation commands run:

1. `npx eslint src/lib/auth.ts src/app/dashboard/user-account/_components/delete-user-card.tsx src/app/dashboard/user-account/page.tsx src/app/dashboard/user-account/_components/auth-resilience-card.tsx src/components/forms/sign-in-form.tsx src/components/forms/forget-password-form.tsx src/components/forms/reset-password-email-otp-form.tsx src/components/forms/reset-password-phone-otp-form.tsx src/components/forms/invite-member-form.tsx src/app/auth/forget-password/page.tsx src/app/api/auth/webhook/phone-otp/route.ts`
2. `npx tsc --noEmit`
3. `npm run build`

Outcome:

- lint passed
- typecheck passed
- build passed (Next.js compile + TypeScript + route generation)

## Remaining Work (Not Yet Implemented)

These strategy items remain open and should be handled next:

1. **Finalize anti-enumeration policy at endpoint contract level**
   - decide where to return generic success vs generic failure for all public auth entry points.
2. **Define explicit SIM-loss recovery runbook**
   - document required support checks, acceptable proofs, and recovery actions.
3. **Ship monitoring and alerts**
   - add dashboards and alerting for OTP delivery failure rate, throttle hit spikes, and verification error patterns.

## Suggested Next Execution Order

1. Finalize endpoint-level anti-enumeration response policy.
2. Write and approve SIM-loss support recovery runbook.
3. Add OTP operational dashboards/alerts and connect escalation thresholds.

## Update Note (2026-02-09)

- `primaryAuthChannel` is no longer a persisted user column.
- Current project policy: keep source-of-truth identity facts in DB, and derive channel summary in code.
- Account UI now computes channel summary from verified email/phone capability on read.
