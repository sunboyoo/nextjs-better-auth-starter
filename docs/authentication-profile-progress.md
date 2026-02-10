# Authentication Profile Feature Progress

- Branch: `feature/authentication-profile`
- Last updated: 2026-02-10
- Status: In progress

## Goal
Make `AuthenticationProfile` the single source of truth for sign-in UX and server-side allowed primary methods.

## Research Summary (Current State)
1. Profile config already exists in `src/config/authentication/{types.ts,profiles.ts,resolve.ts}` and supports env-based resolution via `AUTHENTICATION_PROFILE` (registry key or `profile.id`).
2. Auth UI is currently legacy and mostly single-page under `src/app/auth/sign-in/page.tsx` + `src/app/auth/sign-in/_components/sign-in.tsx` + `src/components/forms/sign-in-form.tsx`.
3. `/auth/sign-in/method`, `/auth/sign-in/two-factor`, and `/auth/sign-in/biometric` do not exist yet.
4. Current two-factor redirect is hardcoded in `src/lib/auth-client.ts` to `/auth/two-factor`.
5. Better Auth server (`src/lib/auth.ts`) has extensive `hooks.before` logic (captcha/throttles/synthetic-email rules) but no profile-driven allowed-primary-method enforcement yet.

## Milestone Plan

### Milestone 1: Foundation + profile flow utilities (runnable)
- Add profile-to-client-safe mapping utilities.
- Add flow helpers for determining step routing and identifier parsing.
- Start architecture doc with canonical flow decisions.
- Files (planned):
  - `src/config/authentication/*` (small helper additions)
  - `src/lib/*` (flow helpers)
  - `docs/authentication-profile-architecture.md`

### Milestone 2: Profile-driven identify step at `/auth/sign-in` (runnable)
- Convert `/auth/sign-in/page.tsx` to server-resolved profile + client step renderer.
- Render identifier-first vs single-screen dynamically.
- Apply social placement rules for Step 1.
- Keep sign-up tab behavior intact.
- Files (planned):
  - `src/app/auth/sign-in/page.tsx`
  - `src/app/auth/sign-in/_components/*`
  - `src/components/forms/sign-in-form.tsx` (configurable methods/identifiers)

### Milestone 3: Method and biometric steps (runnable)
- Add `/auth/sign-in/method` route.
- Add `/auth/sign-in/biometric` route for dedicated passkey page.
- Implement fallback routing and passkey auto-attempt rules.
- Files (planned):
  - `src/app/auth/sign-in/method/page.tsx`
  - `src/app/auth/sign-in/biometric/page.tsx`
  - shared auth-step components

### Milestone 4: MFA route + redirect integration (runnable)
- Add `/auth/sign-in/two-factor` profile-driven page.
- Update `twoFactorClient` redirect target.
- Keep legacy `/auth/two-factor` URLs as compatibility redirects.
- Files (planned):
  - `src/app/auth/sign-in/two-factor/page.tsx`
  - `src/app/auth/two-factor/page.tsx`
  - `src/app/auth/two-factor/otp/page.tsx`
  - `src/lib/auth-client.ts`

### Milestone 5: Server-side enforcement (runnable)
- Enforce `allowedPrimaryMethods` in Better Auth `hooks.before`.
- Use profile `methodToPaths` matching with safe generic error response.
- Keep callbacks behavior controlled by profile config.
- Files (planned):
  - `src/lib/auth.ts`
  - potential small helper module in `src/config/authentication` or `src/lib`

### Milestone 6: Validation + docs finalize
- Run lint/typecheck.
- Manual flow checklist for key profiles.
- Finalize architecture doc and update this progress file with outcomes.

## Running Checklist
- [x] Research current auth flow and profile config
- [x] Create living progress doc
- [x] Milestone 1 complete
- [x] Milestone 2 complete
- [x] Milestone 3 complete
- [x] Milestone 4 complete
- [x] Milestone 5 complete
- [x] Milestone 6 complete

## Milestone Updates

### Milestone 1 (Completed)
What was done:
1. Added client-safe profile snapshot utility so server-resolved profile data can be passed to client components without serializing `RegExp` (`src/config/authentication/client.ts`).
2. Added reusable flow helpers for identifier parsing, callback preservation, social placement checks, method compatibility, and step routing decisions (`src/lib/authentication-profile-flow.ts`).
3. Added server-enforcement helper utilities to map request path -> auth method and evaluate callback path behavior (`src/config/authentication/enforcement.ts`).
4. Started architecture document (`docs/authentication-profile-architecture.md`).

Decisions:
1. Keep profile resolution server-side; pass client-safe subset only.
2. Use helper-driven flow logic instead of hard-coding route logic inside page components.
3. Prepare enforcement matching helper now, then wire it in `src/lib/auth.ts` in Milestone 5.

Validation run:
1. `pnpm exec eslint src/config/authentication/client.ts src/config/authentication/enforcement.ts src/lib/authentication-profile-flow.ts` (pass).
2. `pnpm exec tsc --noEmit` (pass).

Next:
1. Build profile-driven `/auth/sign-in` identify step while preserving sign-up tab and existing callback semantics.

### Milestone 2 (Completed)
What was done:
1. Converted `src/app/auth/sign-in/page.tsx` into a server-resolved profile entrypoint.
2. Added `src/app/auth/sign-in/_components/sign-in-page-client.tsx` to keep client-only query/One Tap behavior while receiving profile props from server.
3. Reworked sign-in rendering logic in `src/app/auth/sign-in/_components/sign-in.tsx`:
   - identifier-first profiles now render a dedicated Step 1 identifier page
   - single-screen profiles continue to render password/OTP/magic-link form on `/auth/sign-in`
4. Added `src/app/auth/sign-in/_components/sign-in-identify-step.tsx` for profile-driven Step 1 identifier capture and routing to method/biometric pages.
5. Added `src/app/auth/sign-in/_components/social-sign-in-buttons.tsx` and wired social visibility to profile social placement rules.
6. Extended `src/components/forms/sign-in-form.tsx` with profile controls:
   - restrict allowed identifier tabs
   - restrict allowed primary methods rendered in form
   - support fixed identifier mode for later method-step reuse

Decisions:
1. Keep sign-up tab visible on `/auth/sign-in` for backward compatibility.
2. Preserve existing captcha-based method handlers by adapting `SignInForm` instead of replacing it.
3. Keep One Tap enabled only when profile Step 1 social is enabled.

Validation run:
1. `pnpm exec eslint src/app/auth/sign-in/page.tsx src/app/auth/sign-in/_components/sign-in-page-client.tsx src/app/auth/sign-in/_components/sign-in.tsx src/app/auth/sign-in/_components/sign-in-identify-step.tsx src/app/auth/sign-in/_components/social-sign-in-buttons.tsx src/components/forms/sign-in-form.tsx` (pass).
2. `pnpm exec tsc --noEmit` (pass).

Next:
1. Add `/auth/sign-in/method` and `/auth/sign-in/biometric` pages and wire passkey-first fallback routing.

### Milestone 3 (Completed)
What was done:
1. Added profile-driven route entrypoints:
   - `src/app/auth/sign-in/method/page.tsx`
   - `src/app/auth/sign-in/biometric/page.tsx`
2. Added `src/app/auth/sign-in/_components/sign-in-method-step.tsx`:
   - reads identifier/callback context from URL
   - applies profile method filtering and identifier compatibility rules
   - supports auto passkey attempt (`autoAttemptPasskey`) for identifier-first profiles
   - renders only allowed fallback methods and Step 2 social placement
3. Added `src/app/auth/sign-in/_components/sign-in-biometric-step.tsx`:
   - dedicated passkey attempt page
   - automatic fallback to `/auth/sign-in/method` on failure/cancel when profile allows fallback
4. Reused profile-aware `SignInForm` for method fallback forms to preserve existing captcha-integrated handlers.

Decisions:
1. Keep method context in URL query params (`callbackUrl`, `identifierType`, `identifier`) to maintain stable routing and avoid extra persistence layers.
2. For phone identifier fallback form, keep phone editable in method step (`fixedIdentifier` is only applied to email/username), avoiding incorrect country/dial-code assumptions.
3. Use sessionStorage keys to ensure passkey auto-attempt runs once per route context.

Validation run:
1. `pnpm exec eslint src/app/auth/sign-in/method/page.tsx src/app/auth/sign-in/biometric/page.tsx src/app/auth/sign-in/_components/sign-in-method-step.tsx src/app/auth/sign-in/_components/sign-in-biometric-step.tsx src/app/auth/sign-in/_components/sign-in.tsx src/components/forms/sign-in-form.tsx` (pass).
2. `pnpm exec tsc --noEmit` (pass).

Next:
1. Add profile-driven MFA route (`/auth/sign-in/two-factor`) and move two-factor redirect target from legacy `/auth/two-factor`.

### Milestone 4 (Completed)
What was done:
1. Added new profile-driven MFA route entrypoint: `src/app/auth/sign-in/two-factor/page.tsx`.
2. Added `src/app/auth/sign-in/_components/sign-in-two-factor-step.tsx`:
   - reads callback context from query params
   - renders allowed MFA factors from profile (`totp`, `emailOtp` currently supported in UI)
   - keeps unsupported configured factors visible as explicit status text
3. Updated Better Auth client plugin redirect in `src/lib/auth-client.ts` to route to `/auth/sign-in/two-factor` (and preserve `callbackUrl` query when present).
4. Converted legacy routes to compatibility redirects:
   - `src/app/auth/two-factor/page.tsx` -> `/auth/sign-in/two-factor`
   - `src/app/auth/two-factor/otp/page.tsx` -> `/auth/sign-in/two-factor?factor=emailOtp`

Decisions:
1. Keep old `/auth/two-factor*` URLs alive as redirects to avoid breaking existing links/bookmarks/dev habits.
2. Surface unsupported MFA factor types explicitly instead of silently ignoring them.

Validation run:
1. `pnpm exec eslint src/app/auth/sign-in/two-factor/page.tsx src/app/auth/sign-in/_components/sign-in-two-factor-step.tsx src/app/auth/two-factor/page.tsx src/app/auth/two-factor/otp/page.tsx src/lib/auth-client.ts` (pass).
2. `pnpm exec tsc --noEmit` (pass).

Next:
1. Add server-side enforcement in `src/lib/auth.ts` for `allowedPrimaryMethods` using active profile resolution and method/path matching.

### Milestone 5 (Completed)
What was done:
1. Integrated profile-driven server enforcement in `src/lib/auth.ts` `hooks.before`:
   - resolves active profile via `getActiveAuthenticationProfileServer()`
   - maps incoming auth path -> method with `findAuthenticationMethodForPath(...)`
   - blocks disallowed unauthenticated primary method calls with safe generic error
2. Applied callback-specific handling:
   - callback paths are detected via `isAuthCallbackPath(...)`
   - callbacks can be allowed/blocked by profile `server.allowCallbacks`
3. Reused helper module from Milestone 1 (`src/config/authentication/enforcement.ts`) to keep path matching and allow checks centralized.

Decisions:
1. Enforcement applies to unauthenticated requests only to avoid breaking authenticated account-management paths that may share endpoint patterns.
2. Error response is intentionally generic to avoid leaking method/profile details.

Validation run:
1. `pnpm exec eslint src/lib/auth.ts src/config/authentication/enforcement.ts` (pass).
2. `pnpm exec tsc --noEmit` (pass).

Next:
1. Perform end-to-end validation checklist, document assumptions/known gaps, and finalize architecture/progress docs.

### Milestone 6 (Completed)
What was done:
1. Ran full repo lint/type checks and production build after all auth-profile changes.
2. Ran targeted profile flow assertions via `tsx` script to validate helper logic around profile resolution/step behavior/method mapping.
3. Finalized architecture and progress docs with current implementation state.

Validation results:
1. `pnpm run lint` (pass).
2. `pnpm exec tsc --noEmit` (pass).
3. `pnpm run build` (pass).
4. `pnpm exec tsx -e \"...profile flow checks...\"` (pass, 8 checks).

Checklist status (requested scenarios):
1. Switching `AUTHENTICATION_PROFILE` changes rendered identifiers/method branches:
   - verified at config/helper level and by route component wiring to active profile resolution.
2. Identifier-first + biometrics:
   - `/auth/sign-in` now routes to `/auth/sign-in/biometric` when profile uses dedicated biometric page.
   - biometric page attempts passkey and falls back to `/auth/sign-in/method` on error/cancel when configured.
3. Identifier-first non-biometrics:
   - `/auth/sign-in/method` auto-attempts passkey once when `autoAttemptPasskey.enabled` and profile permits.
4. Server enforcement:
   - `hooks.before` now blocks disallowed primary methods for unauthenticated calls using profile method mapping.

Known assumptions / gaps:
1. Passkey success -> MFA skip behavior relies on Better Auth runtime behavior for passkey flows (UI routes are configured correctly, but hardware/WebAuthn execution was not end-to-end tested in this environment).
2. MFA UI currently supports `totp` and `emailOtp`; configured `backupCode`/`smsOtp` factors are surfaced as unsupported in the sign-in MFA page message.

## Open Questions / Risks
1. `profile.server.methodToPaths` includes broad patterns (for example `/email-otp/*` and `/phone-number/*`), so enforcement must avoid breaking non-sign-in authenticated flows.
2. Current app has TOTP and email OTP 2FA UI; backup-code/sms-OTP MFA UI may need graceful handling if present in profile factors.
3. Passkey + MFA skip behavior may depend on Better Auth plugin internals; we will enforce profile routing behavior and validate with manual checks.

## Validation Strategy
1. `pnpm exec eslint` on touched files after each milestone.
2. `pnpm exec tsc --noEmit` after major milestones.
3. Manual route checks:
   - `/auth/sign-in`
   - `/auth/sign-in/method`
   - `/auth/sign-in/biometric`
   - `/auth/sign-in/two-factor`
4. Server enforcement smoke checks by POSTing disallowed endpoints (or exercising via UI and direct calls).
