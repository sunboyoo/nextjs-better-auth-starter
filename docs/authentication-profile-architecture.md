# Authentication Profile Architecture

- Branch: `feature/authentication-profile`
- Status: Draft (will be refined as milestones land)

## Objective
`AuthenticationProfile` is the single contract for sign-in routing, rendered methods, and server-side allowed primary methods.

## Core Design
1. Profile resolution occurs server-side via `getActiveAuthenticationProfileServer()`.
2. Pages use stable routes only:
   - Step 1 Identify: `/auth/sign-in`
   - Step 2 Authenticate: `/auth/sign-in/method`
   - Step 3 MFA: `/auth/sign-in/two-factor`
   - Optional Biometric: `/auth/sign-in/biometric`
3. Client render logic is profile-driven:
   - Identifiers from `profile.identify.identifiers`
   - Method visibility from `profile.authenticate.methods`
   - Social placement from `profile.identify.socialPlacement`
   - Biometric routing from `profile.biometric`
4. Server enforcement is profile-driven:
   - `allowedPrimaryMethods` + `methodToPaths` gate sign-in method endpoints in Better Auth hook middleware.
   - Return generic safe errors for disallowed methods.

## Implemented Foundation
1. `src/config/authentication/client.ts` provides client-safe profile snapshots (excludes non-serializable server path regex map).
2. `src/lib/authentication-profile-flow.ts` centralizes flow parsing/routing helpers:
   - callback + identifier extraction from query params
   - single-screen vs identifier-first branching
   - social placement checks
   - method/identifier compatibility checks
3. `src/config/authentication/enforcement.ts` provides reusable path-to-method matching helpers for hook enforcement integration.

## Implemented Step 1
1. `/auth/sign-in` is now server-resolved for active profile selection and rendered client-side via profile props.
2. Step 1 rendering branches by profile:
   - identifier-first: identifier capture and deterministic route to method/biometric
   - single-screen: existing method handlers rendered in-place with profile method restrictions
3. Social buttons and Google One Tap are now gated by profile Step 1 social placement.

## Implemented Step 2 + Biometric
1. `/auth/sign-in/method` resolves profile server-side and renders method options from profile configuration.
2. Method rendering is filtered by:
   - `profile.authenticate.methods`
   - `profile.authenticate.requireIdentifierFor`
   - identifier/method compatibility (email-only, phone-only constraints)
3. `/auth/sign-in/biometric` is the dedicated passkey step for biometric profiles and falls back to `/auth/sign-in/method` when passkey fails/cancels.
4. `autoAttemptPasskey` behavior is implemented for non-dedicated biometric flows (one attempt per route context via session storage key).

## Implemented Step 3 (MFA Route)
1. `/auth/sign-in/two-factor` is the new canonical MFA route.
2. Better Auth client two-factor redirects now target `/auth/sign-in/two-factor` and preserve `callbackUrl` when available.
3. Legacy `/auth/two-factor` and `/auth/two-factor/otp` routes now redirect to the canonical route for compatibility.

## Implemented Server Enforcement
1. Better Auth `hooks.before` now enforces profile-driven primary method availability for unauthenticated requests.
2. Enforcement pipeline:
   - resolve active profile
   - map request path to auth method via `methodToPaths`
   - verify method in `allowedPrimaryMethods`
   - apply callback allow/deny behavior via `allowCallbacks`
3. Disallowed method attempts return a generic safe error message (no account/profile detail leakage).

## Flow Summary
1. Step 1 (`/auth/sign-in`): collect identifier (or run single-screen profile), then continue to method/biometric according to profile.
2. Optional biometric step attempts passkey and, on failure/cancel, falls back to method step.
3. Method step renders only allowed methods and required identifier constraints.
4. If Better Auth requires two-factor, client redirect lands on `/auth/sign-in/two-factor`, which renders factors permitted by profile.

## Non-goals
1. Introduce v1/v2 route variants.
2. Add heavy new dependencies.
3. Replace existing account-management auth features outside sign-in flow.

## Current Gaps
1. MFA UI currently implements `totp` and `emailOtp`; `backupCode`/`smsOtp` are indicated as configured-but-not-rendered.
2. Passkey + MFA skip is expected from profile + Better Auth behavior; this environment did not run full hardware-backed WebAuthn validation.
