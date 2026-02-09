# Recommended Profile Completion Flow ("Wizard")

This document outlines a user-friendly, low-friction "Profile Completion" wizard that runs immediately after signup.

## UX Philosophy: "Progressive & Positive"

-   **Goal**: Gather critical identity (name/username) and security (recovery channel) info without feeling like a chore.
-   **Tone**: Welcoming, helpful, and secure. Avoid "mandatory" language.
-   **Structure**: 3 simple steps with clear progress indicators.

---

## Step 1: Your Public Identity (The "Welcome" Step)

**Goal**: Personalize the account.
**Context**: User just signed up with a raw phone number or email. They are currently "User 12345".

### UI Elements
1.  **Header**: "Welcome to the community! Let's get you set up."
2.  **Avatar Upload (Center Stage)**:
    -   Large circular placeholder with a "camera" icon overlay.
    -   *Action*: Click to upload or drag-and-drop.
    -   *Tech*: Use a lightweight image cropper if possible, or just raw upload.
3.  **Display Name (Input)**:
    -   *Label*: "What should we call you?"
    -   *Placeholder*: "Jane Doe"
    -   *Validation*: Required.
4.  **Username (Input)**:
    -   *Label*: "Choose a unique username"
    -   *Prefix*: "@"
    -   *Validation*: Async check for uniqueness as they type (debounced). Show a green checkmark when available.
5.  **Action**: "Continue" button (primary).

### Technical Note
-   **API**: batch update `user.name`, `user.username`, `user.image`.
-   **Better Auth**: `authClient.updateUser({ name, image })`. For username, ensure the plugin handles the update or use a custom endpoint if needed for validation.

---

## Step 2: Secure Your Account (The "Peace of Mind" Step)

**Goal**: Add a password for traditional login access (optional but recommended).
**Context**: User likely signed up with OTP. A password gives them a backup login method if they lose their phone/email access.

### UI Elements
1.  **Header**: "Set a backup password"
2.  **Subtext**: "This is optional, but it helps you log in on other devices easily."
3.  **Password Input**:
    -   *Features*: "Show/Hide" toggle.
    -   *Strength Meter*: Simple bar (Weak -> Strong).
4.  **Actions**:
    -   "Save Password" (Primary button).
    -   "Skip for now" (Text link, subtle).

### Technical Note
-   **API**: `authClient.updateUser({ password: newPassword })`.
-   **Logic**: Only show this step if the user *doesn't* have a password yet (check `user.password` is null/empty).

---

## Step 3: Never Get Locked Out (The "Dual-Channel" Step)

**Goal**: Secure a second recovery channel (Phone or Email).
**Context**: PROPOSAL from research - If user has Phone, ask for Email. If Email, ask for Phone.

### Scenario A: User Signed up with PHONE
**Ask**: "Add an email for recovery & notifications."
**UI**:
1.  **Icon**: Email envelope.
2.  **Input**: Email Address.
3.  **Why?**: "We'll send you a magic link if you ever lose your phone."
4.  **Action**: "Verify Email".
    -   *Flow*: Sends OTP/Link -> User enters code -> Account updated.
    -   *Backend*: Replaces the `synthetic` email with this real one.

### Scenario B: User Signed up with EMAIL
**Ask**: "Add a phone number for 2-step verification."
**UI**:
1.  **Icon**: Mobile phone.
2.  **Input**: Phone Number (with country code selector).
3.  **Why?**: "Add an extra layer of security and SMS recovery."
4.  **Action**: "Verify Phone".
    -   *Flow*: Sends SMS OTP -> User enters code -> Phone added to user.

### Action Buttons
-   "Finish" (Primary, if verified).
-   "Skip" (Secondary/Text link).

---

## Completion State ("All Set!")

**UI**:
-   Full screen "Confetti" or success animation.
-   **Message**: "You're all set, [Name]!"
-   **Redirect**: Auto-redirect to `/dashboard` after 2 seconds.

## Summary Checklist for Dev

1.  [ ] **State Management**: Use a specialized "Onboarding Context" or URL query params (`?step=profile`, `?step=security`) to manage wizard state.
2.  [ ] **Persistence**: If user drops off at Step 2, next login should ideally prompt them to "Finish setup" (optional feature).
3.  [ ] **Skippability**: Ensure "Skip" works and marks the onboarding as "seen" so they aren't pestered immediately again.
