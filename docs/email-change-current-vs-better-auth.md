# Email Change & Verification: Current Implementation vs Better Auth Documentation

Last updated: 2026-02-01

This document captures how the current codebase handles admin/user email changes and verification, and contrasts it with Better Auth's documented `changeEmail` flow. It is intended as background for future development.

---

## Scope

- Current codebase behavior (admin-focused, with future user self-service endpoint).
- Better Auth's documented `changeEmail` verification flow.
- Differences, implications, and future options (no code).

---

## Current Codebase Implementation (as of 2026-02-01)

### 1) Auth configuration baseline

**File:** `src/lib/auth.ts`

- `emailAndPassword.enabled = true`
- `emailAndPassword.requireEmailVerification = true`
- `emailVerification.sendVerificationEmail` is implemented (email sending callback).
- `user.changeEmail` is **not enabled** (no config present).
- `account.accountLinking.enabled = true`
- Social providers: Google + GitHub

**Implication:**
- Email/password login requires `emailVerified = true`.
- There is no built-in change-email flow active for users; admin updates are direct data updates.

### 2) Admin email change flow

**UI entry:** `src/components/admin/user-email-dialog.tsx`

**Steps:**
1) Admin edits email in the dialog.
2) Admin confirms update.
3) The dialog calls `updateUserEmail(userId, email, { emailVerified? })`.
4) Optionally sends verification email if the admin toggles that option.

**Key behavior:**
- **Immediate update** of the user’s email through the admin update endpoint.
- Email verification status is controlled by the admin toggle:
  - If **Mark verified** is on → `emailVerified = true`.
  - If off → email is **unverified**.
- Optional “send verification email” runs **after** the update.

**Implementation details:**
- `updateUserEmail` → `authClient.admin.updateUser` with `{ email, emailVerified? }`.
- This does **not** call Better Auth’s `changeEmail` endpoint.

### 3) Admin-assisted verification email endpoint

**Route:** `POST /api/admin/users/send-verification-email`

**File:** `src/app/api/admin/users/send-verification-email/route.ts`

**Behavior:**
- Requires `requireAdmin()` (admin session).
- Accepts `{ email, callbackURL? }`.
- Calculates `emailMismatch` if target email != admin session email.
- **Does not block** on mismatch; returns info + continues to send.
- If user not found, returns `status: true` (no email sent).
- Uses Better Auth’s `createEmailVerificationToken` + configured `sendVerificationEmail` callback.

**Response fields:**
- `status: true`
- `emailMismatch: boolean`
- `info: "EMAIL_MISMATCH"` when mismatch occurs

### 4) User self-service verification endpoint (future UI)

**Route:** `POST /api/user/send-verification-email`

**File:** `src/app/api/user/send-verification-email/route.ts`

**Behavior:**
- Requires `requireAuth()` (any logged-in user).
- Uses current session user email only.
- If already verified, returns `{ status: true, alreadyVerified: true }`.
- Otherwise sends a verification email via Better Auth callback.

### 5) Built-in Better Auth verification endpoint (not used by admin flow)

**Route:** `POST /api/auth/send-verification-email` (Better Auth built-in)

**Key behavior (from Better Auth source):**
- If **session exists** and `email !== session.user.email` → **EMAIL_MISMATCH error**.
- If already verified → **EMAIL_ALREADY_VERIFIED error**.
- If **no session**, it sends only if the user exists; otherwise returns `status: true` without sending.

**Reason we bypassed this endpoint for admin flow:**
- Admin often sends verification for another user, which triggers `EMAIL_MISMATCH` if using the built-in endpoint.

### 6) User experience implications (current)

- **Email/password login:** If admin changes email and leaves it unverified, the user cannot sign in with password until verification.
- **OAuth logins (Google/GitHub):** Existing OAuth accounts are not automatically unlinked by email change. OAuth sign-in remains tied to linked accounts.
- **Admin mismatch notice:** Admin can send verification to another user and will only receive an informational mismatch flag.

---

## Better Auth Documented `changeEmail` Flow (Strict Verification)

**Docs:** Better Auth “User & Accounts” → “Change Email”.

### 1) Enablement

`changeEmail` is disabled by default. It requires:

- `user.changeEmail.enabled = true`
- `emailVerification.sendVerificationEmail` configured

### 2) Standard flow

- Client calls `authClient.changeEmail({ newEmail, callbackURL? })`.
- A verification email is sent **to the new email**.
- The email is **only updated after verification**.

### 3) Optional confirmation via current email

- Configure `sendChangeEmailConfirmation`.
- User must confirm via **current email** before the new email verification is sent.

### 4) Optional immediate update for unverified users

- `updateEmailWithoutVerification = true`
- Only applies if the **current email is not verified**.

### 5) Verification handling

- Better Auth’s `/verify-email` endpoint updates email on successful verification (for change-email tokens).
- If there is no active session during verification, it can create a session and still apply the email update.

---

## Key Differences & Implications

### 1) Who can change email

- **Current codebase:** Admin updates any user’s email directly.
- **Better Auth changeEmail:** Applies to the **current session user only**.

### 2) Timing of update

- **Current codebase:** Email changes **immediately** in the database.
- **changeEmail flow:** Email changes **only after verification** (unless explicitly allowed for unverified current emails).

### 3) Verification enforcement

- **Current codebase:** Optional; admin decides whether to mark verified or send verification.
- **changeEmail flow:** Verification is **built-in** and central to the flow.

### 4) Email mismatch behavior

- **Current codebase:** Mismatch reported as info but **does not block** sending.
- **Built-in verification endpoint:** Mismatch **blocks** sending when session exists.

### 5) Security + audit implications

- **Immediate admin update** can bypass user consent unless paired with explicit verification or confirmation.
- **changeEmail flow** provides stronger user consent guarantees and avoids stale/incorrect emails in the database.

---

## Future Options (No Code)

1) **Keep admin direct update** for operational support and speed.
2) **Add a strict admin-assisted flow**:
   - Admin triggers a verification-only process (no immediate update).
   - User completes verification to finalize update.
3) **Hybrid**:
   - Admin can still force-update (emergency support), but default to strict verification for routine changes.

---

## References (Better Auth)

- User & Accounts → Change Email (official docs)
  - https://www.better-auth.com/docs/concepts/users-accounts
- Admin plugin docs (admin update-user endpoint)
  - https://www.better-auth.com/docs/plugins/admin
- Email verification behavior (sendVerificationEmail)
  - https://www.better-auth.com/docs/concepts/email

