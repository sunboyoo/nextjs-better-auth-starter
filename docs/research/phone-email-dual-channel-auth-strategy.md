# Dual-Channel Auth Strategy (Phone + Email)

## Purpose

Define a long-term authentication strategy for this Better Auth starter so users can operate with either:

- Phone number only (common in some markets)
- Email only (common privacy preference in US/EU)
- Both channels (best recovery and flexibility)

This document is intentionally high-level and implementation-agnostic.

## Current Baseline in This Repository

- `email` is currently required and unique in the user schema.
- `username` is optional.
- Signup UI is email-first.
- Email/password auth requires email verification.
- Username plugin is enabled.

Implication: today, truly phone-only users cannot complete registration without a synthetic email path.

## Strategic Goal

Adopt a capability-based model:

- A user account must have at least one verified login channel.
- Login and recovery options are enabled only for channels the user has verified.
- Users are encouraged (not always required) to add a second channel for resilience.

## Recommended Identity Model

Treat identity channels as capabilities, not assumptions.

- Email channel:
  - Can support password login, email OTP, magic link, email recovery, org invites.
- Phone channel:
  - Can support phone OTP login and phone OTP recovery.
- Username:
  - Optional human-friendly identifier for credential login, not a standalone recovery channel.

## Core Policy Decisions

1. Sign up requires at least one of email or phone.
2. At signup completion, at least one channel must be verified.
3. Do not show or offer channel-specific auth options if the user lacks that verified channel.
4. Require stronger safeguards for high-risk operations (channel changes, password reset, account deletion).

## Temporary Email Strategy for Phone-First Signup

Better Auth core expects an email on user records. For phone-first flows, use a synthetic email only as a technical placeholder.

Recommended practices:

- Use a reserved non-deliverable domain, for example `*.invalid`.
- Mark synthetic email explicitly (do not infer from `emailVerified`).
- Store explicit persisted metadata:
  - `emailSource = synthetic | user_provided`
  - `emailDeliverable = true | false`
- Derive channel summary at runtime:
  - `primaryAuthChannel = phone | email | mixed` (computed from verified email/phone capability)
- Never send magic links or email OTP to synthetic addresses.
- Prompt phone-first users to add a real email later for recovery and collaboration features.

## Why Explicit Synthetic Email Flags Matter

Without explicit flags, the system cannot reliably distinguish:

- Temporary/synthetic addresses
- Real but unverified addresses
- Real deliverable addresses that failed verification

This distinction is required for safe UX and routing decisions.

## Channel-Specific UX Policy

- Phone-only users:
  - See phone OTP login and phone recovery.
  - Do not see email OTP/magic link actions until a real verified email is added.
- Email-only users:
  - See email/password, email OTP, magic link.
  - Do not require phone.
- Mixed users:
  - Can use both.
  - Encourage backup authentication setup (second channel and/or passkey).

## Recovery and Security Best Practices

1. Normalize phone numbers to E.164 before storage/comparison.
2. Apply strict rate limits per phone and per IP for OTP endpoints.
3. Enforce OTP expiry and attempt caps.
4. Keep anti-enumeration responses for signup/recovery endpoints.
5. Treat phone number changes as verified operations (OTP-based confirmation), not direct profile edits.
6. Mitigate SIM-swap risk:
  - Offer passkeys as a strong backup factor.
  - Consider backup codes for account recovery.

## Product and Business Impact

Benefits:

- Expands addressable markets where phone-first behavior dominates.
- Preserves privacy-friendly email-only path for users who avoid phone sharing.
- Improves account resilience for users with both channels.

Tradeoffs:

- More complex routing and UX state management.
- SMS cost, deliverability variance, and regional compliance constraints.
- Additional anti-abuse and operational monitoring requirements.

## Phased Rollout Plan

1. Foundation
   - Define capability model and synthetic-email metadata policy.
   - Define endpoint security/rate-limit policy for phone flows.
2. Dual-channel signup and signin
   - Offer email-first and phone-first entry paths.
   - Gate UI by channel capability.
3. Account settings and linking
   - Add safe flows to add/verify second channel.
   - Add channel-specific update and recovery UX.
4. Hardening
   - Add passkeys/backup recovery options.
   - Add anti-abuse dashboards and alerting.
5. Migration and cleanup
   - Backfill metadata for existing users.
   - Add admin tooling for support and edge-case remediation.

## Recommended Default Policy for This Project

- Keep both phone-first and email-first signup paths.
- Require one verified channel to activate account.
- Use synthetic email only as an internal compatibility bridge for phone-first users.
- Track synthetic-vs-real email explicitly.
- Do not expose email-based login/recovery features to synthetic-email users.
- Encourage users to add a second verified channel over time.

## Open Questions to Resolve Before Full Rollout

1. Should organizations/invitations remain email-only, or add phone-based invite acceptance?
2. For phone-only users, what is the required recovery path if SIM is lost?
3. Which regions/providers are in scope for SMS delivery and compliance first?
4. What fraud controls are mandatory at launch vs post-launch?
