# Dashboard Endpoint Inventory

## Scope
`src/app/dashboard/**`

## Extraction Notes
- Includes every `/api/...` URL literal found in this scope.
- Dynamic placeholders are normalized to canonical parameter names (for example `${applicationId}`, `${resourceId}`, `${actionId}`).

## Direct Endpoint Patterns (18)

### `/api/user/organizations/${organizationId}/applications`
- `src/app/dashboard/organizations/[organizationId]/applications/page.tsx:222`

### `/api/user/organizations/${organizationId}/applications?${params.toString()}`
- `src/app/dashboard/organizations/[organizationId]/applications/page.tsx:168`

### `/api/user/organizations/${organizationId}/applications/${applicationId}`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/layout.tsx:47`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/page.tsx:113`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/page.tsx:144`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/page.tsx:92`
- `src/app/dashboard/organizations/[organizationId]/applications/page.tsx:254`
- `src/app/dashboard/organizations/[organizationId]/applications/page.tsx:277`
- `src/app/dashboard/organizations/[organizationId]/applications/page.tsx:291`

### `/api/user/organizations/${organizationId}/applications/${applicationId}/resources`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/page.tsx:178`

### `/api/user/organizations/${organizationId}/applications/${applicationId}/resources?${params.toString()}`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/page.tsx:134`

### `/api/user/organizations/${organizationId}/applications/${applicationId}/resources/${resourceId}`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/layout.tsx:42`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/page.tsx:111`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/page.tsx:141`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/page.tsx:91`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/page.tsx:223`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/page.tsx:255`

### `/api/user/organizations/${organizationId}/applications/${applicationId}/resources/${resourceId}/actions`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/actions/page.tsx:178`

### `/api/user/organizations/${organizationId}/applications/${applicationId}/resources/${resourceId}/actions?${params.toString()}`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/actions/page.tsx:134`

### `/api/user/organizations/${organizationId}/applications/${applicationId}/resources/${resourceId}/actions/${actionId}`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/actions/[actionId]/page.tsx:114`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/actions/[actionId]/page.tsx:144`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/actions/[actionId]/page.tsx:94`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/actions/page.tsx:223`
- `src/app/dashboard/organizations/[organizationId]/applications/[applicationId]/resources/[resourceId]/actions/page.tsx:255`

### `/api/user/organizations/${organizationId}/invitations/${invitationId}`
- `src/app/dashboard/organizations/[organizationId]/invitations/[invitationId]/page.tsx:137`

### `/api/user/organizations/${organizationId}/members/${memberId}`
- `src/app/dashboard/organizations/[organizationId]/members/[memberId]/page.tsx:51`

### `/api/user/organizations/${organizationId}/roles`
- `src/app/dashboard/organizations/[organizationId]/organization-roles/page.tsx:105`
- `src/app/dashboard/organizations/[organizationId]/organization-roles/page.tsx:357`

### `/api/user/organizations/${organizationId}/roles/${roleId}`
- `src/app/dashboard/organizations/[organizationId]/organization-roles/[organizationRoleId]/page.tsx:102`
- `src/app/dashboard/organizations/[organizationId]/organization-roles/[organizationRoleId]/page.tsx:364`
- `src/app/dashboard/organizations/[organizationId]/organization-roles/[organizationRoleId]/page.tsx:464`
- `src/app/dashboard/organizations/[organizationId]/organization-roles/page.tsx:198`
- `src/app/dashboard/organizations/[organizationId]/organization-roles/page.tsx:292`

### `/api/user/organizations/${organizationId}/teams/${teamId}`
- `src/app/dashboard/organizations/[organizationId]/teams/[teamId]/layout.tsx:27`

### `/api/user/organizations/${organizationId}/teams/${teamId}/members`
- `src/app/dashboard/organizations/[organizationId]/teams/[teamId]/team-members/page.tsx:109`
- `src/app/dashboard/organizations/[organizationId]/teams/[teamId]/team-members/page.tsx:164`

### `/api/user/organizations/${organizationId}/teams/${teamId}/members/${memberId}`
- `src/app/dashboard/organizations/[organizationId]/teams/[teamId]/team-members/[teamMemberId]/page.tsx:43`
- `src/app/dashboard/organizations/[organizationId]/teams/[teamId]/team-members/page.tsx:188`

### `/api/user/profile-completion`
- `src/app/dashboard/profile-completion/_components/profile-completion-wizard.tsx:436`
- `src/app/dashboard/profile-completion/page.tsx:54`

### `/api/user/profile-completion/complete`
- `src/app/dashboard/profile-completion/_components/profile-completion-wizard.tsx:463`

## Indirect Better Auth Endpoint Usage
- Files in this scope call `authClient.*` and/or `auth.api.*`, which resolve through Better Auth base path `/api/auth` (see `src/config/authentication/profiles.ts`).
- Files with direct Better Auth API usage in this scope: 30.
- `src/app/dashboard/_components/dashboard-home/active-organization-card.tsx`
- `src/app/dashboard/_components/dashboard-home/email-change-card.tsx`
- `src/app/dashboard/_components/dashboard-home/user-invitations-card.tsx`
- `src/app/dashboard/_components/dashboard/nav-user.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/organizations/[organizationId]/invitations/[invitationId]/page.tsx`
- `src/app/dashboard/organizations/[organizationId]/invitations/page.tsx`
- `src/app/dashboard/organizations/[organizationId]/layout.tsx`
- `src/app/dashboard/organizations/[organizationId]/members/page.tsx`
- `src/app/dashboard/organizations/[organizationId]/teams/[teamId]/team-members/page.tsx`
- `src/app/dashboard/organizations/[organizationId]/teams/page.tsx`
- `src/app/dashboard/organizations/_components/create-organization-dialog.tsx`
- `src/app/dashboard/organizations/_components/invite-member-dialog.tsx`
- `src/app/dashboard/organizations/_components/organization-card.tsx`
- `src/app/dashboard/organizations/page.tsx`
- `src/app/dashboard/profile-completion/_components/profile-completion-wizard.tsx`
- `src/app/dashboard/profile-completion/page.tsx`
- `src/app/dashboard/user-account/_actions/set-password.ts`
- `src/app/dashboard/user-account/_components/delete-user-card.tsx`
- `src/app/dashboard/user-account/_components/user-email-card.tsx`
- `src/app/dashboard/user-account/_components/user-oauth-card.tsx`
- `src/app/dashboard/user-account/_components/user-passkey-card.tsx`
- `src/app/dashboard/user-account/_components/user-password-card.tsx`
- `src/app/dashboard/user-account/_components/user-phone-card.tsx`
- `src/app/dashboard/user-account/_components/user-two-factor-card.tsx`
- `src/app/dashboard/user-account/_components/user-username-card.tsx`
- `src/app/dashboard/user-account/page.tsx`
- `src/app/dashboard/user-profile/_actions/stop-impersonation.ts`
- `src/app/dashboard/user-profile/_components/user-card.tsx`
- `src/app/dashboard/user-profile/page.tsx`
