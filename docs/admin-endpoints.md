# Admin Endpoint Inventory

## Scope
`src/app/admin/**`

## Extraction Notes
- Includes every `/api/...` URL literal found in this scope.
- Dynamic placeholders are normalized to canonical parameter names (for example `${applicationId}`, `${resourceId}`, `${actionId}`).

## Direct Endpoint Patterns (40)

### `/api/admin/applications`
- `src/app/admin/_components/applications/applications-table.tsx:216`

### `/api/admin/applications?limit=${limit}`
- `src/app/admin/_components/assign-roles-to-members/organization-application-selector.tsx:65`
- `src/app/admin/_components/organization-application-roles/organization-application-selector.tsx:65`

### `/api/admin/applications?search=${search}&page=${page}&limit=${limit}`
- `src/app/admin/_components/applications/applications-table.tsx:179`

### `/api/admin/applications/${applicationId}`
- `src/app/admin/_components/applications/application-detail.tsx:118`
- `src/app/admin/_components/applications/applications-table.tsx:255`
- `src/app/admin/_components/applications/applications-table.tsx:282`
- `src/app/admin/_components/applications/applications-table.tsx:879`
- `src/app/admin/_components/dashboard/site-header.tsx:70`
- `src/app/admin/_components/organization-application-roles/organization-application-roles-table.tsx:174`
- `src/app/admin/applications/[applicationId]/resources/page.tsx:22`

### `/api/admin/applications/${applicationId}/actions?limit=200`
- `src/app/admin/_components/organization-application-roles/organization-application-roles-table.tsx:164`

### `/api/admin/applications/${applicationId}/resources`
- `src/app/admin/_components/applications/application-detail.tsx:125`
- `src/app/admin/_components/applications/application-detail.tsx:182`
- `src/app/admin/_components/applications/resources-table.tsx:232`
- `src/app/admin/_components/dashboard/site-header.tsx:79`
- `src/app/admin/applications/[applicationId]/resources/[resourceId]/actions/page.tsx:23`

### `/api/admin/applications/${applicationId}/resources?page=${page}&limit=${limit}&search=${search}`
- `src/app/admin/_components/applications/resources-table.tsx:164`

### `/api/admin/applications/${applicationId}/resources/${resourceId}`
- `src/app/admin/_components/applications/application-detail.tsx:259`
- `src/app/admin/_components/applications/resources-table.tsx:200`
- `src/app/admin/_components/applications/resources-table.tsx:268`

### `/api/admin/applications/${applicationId}/resources/${resourceId}/actions`
- `src/app/admin/_components/applications/actions-table.tsx:193`
- `src/app/admin/_components/applications/application-detail.tsx:133`
- `src/app/admin/_components/applications/application-detail.tsx:220`
- `src/app/admin/_components/applications/application-detail.tsx:275`

### `/api/admin/applications/${applicationId}/resources/${resourceId}/actions?page=${page}&limit=${limit}&search=${search}`
- `src/app/admin/_components/applications/actions-table.tsx:159`

### `/api/admin/applications/${applicationId}/resources/${resourceId}/actions/${actionId}`
- `src/app/admin/_components/applications/actions-table.tsx:232`
- `src/app/admin/_components/applications/actions-table.tsx:263`
- `src/app/admin/_components/applications/application-detail.tsx:288`

### `/api/admin/organizations`
- `src/app/admin/_components/organizations/organization-add-dialog.tsx:53`

### `/api/admin/organizations?${params.toString()}`
- `src/app/admin/_components/organizations/organizations-table.tsx:125`

### `/api/admin/organizations?limit=${limit}`
- `src/app/admin/_components/assign-roles-to-members/organization-application-selector.tsx:57`
- `src/app/admin/_components/organization-application-roles/organization-application-selector.tsx:57`

### `/api/admin/organizations/${organizationId}`
- `src/app/admin/_components/dashboard/site-header.tsx:94`
- `src/app/admin/_components/organizations/organization-edit-dialog.tsx:73`
- `src/app/admin/_components/organizations/organization-info-card.tsx:46`
- `src/app/admin/_components/organizations/organization-profile-tab.tsx:42`
- `src/app/admin/_components/organizations/organization-profile-tab.tsx:51`
- `src/app/admin/_components/organizations/organizations-table.tsx:137`
- `src/app/admin/_components/organizations/organizations-table.tsx:150`

### `/api/admin/organizations/${organizationId}/applications/${applicationId}/member-organization-application-roles`
- `src/app/admin/_components/assign-roles-to-members/assign-roles-to-members.tsx:174`

### `/api/admin/organizations/${organizationId}/applications/${applicationId}/members/${memberId}/organization-application-roles`
- `src/app/admin/_components/assign-roles-to-members/assign-roles-to-members.tsx:242`
- `src/app/admin/_components/assign-roles-to-members/assign-roles-to-members.tsx:285`

### `/api/admin/organizations/${organizationId}/applications/${applicationId}/members/${memberId}/organization-application-roles?roleId=${roleId}`
- `src/app/admin/_components/assign-roles-to-members/assign-roles-to-members.tsx:251`
- `src/app/admin/_components/assign-roles-to-members/assign-roles-to-members.tsx:294`

### `/api/admin/organizations/${organizationId}/applications/${applicationId}/organization-application-roles`
- `src/app/admin/_components/organization-application-roles/organization-application-roles-table.tsx:254`

### `/api/admin/organizations/${organizationId}/applications/${applicationId}/organization-application-roles?${params.toString()}`
- `src/app/admin/_components/organization-application-roles/organization-application-roles-table.tsx:210`

### `/api/admin/organizations/${organizationId}/applications/${applicationId}/organization-application-roles?limit=${limit}`
- `src/app/admin/_components/assign-roles-to-members/assign-roles-to-members.tsx:144`

### `/api/admin/organizations/${organizationId}/applications/${applicationId}/organization-application-roles/${organizationApplicationRoleId}`
- `src/app/admin/_components/organization-application-roles/organization-application-roles-table.tsx:295`
- `src/app/admin/_components/organization-application-roles/organization-application-roles-table.tsx:340`
- `src/app/admin/_components/organization-application-roles/organization-application-roles-table.tsx:364`

### `/api/admin/organizations/${organizationId}/applications/${applicationId}/organization-application-roles/${organizationApplicationRoleId}/actions`
- `src/app/admin/_components/organization-application-roles/organization-application-roles-table.tsx:311`
- `src/app/admin/_components/organization-application-roles/organization-application-roles-table.tsx:392`

### `/api/admin/organizations/${organizationId}/invitations`
- `src/app/admin/_components/organizations/organization-member-invitation-send-dialog.tsx:119`
- `src/app/admin/_components/organizations/organization-member-invitations-table.tsx:153`

### `/api/admin/organizations/${organizationId}/invitations?${params.toString()}`
- `src/app/admin/_components/organizations/organization-member-invitations-table.tsx:135`

### `/api/admin/organizations/${organizationId}/invitations/${invitationId}`
- `src/app/admin/_components/organizations/organization-member-invitations-table.tsx:146`

### `/api/admin/organizations/${organizationId}/members`
- `src/app/admin/_components/organizations/member-add-dialog.tsx:120`

### `/api/admin/organizations/${organizationId}/members?limit=${limit}`
- `src/app/admin/_components/organizations/member-add-dialog.tsx:56`
- `src/app/admin/_components/organizations/organization-member-invitation-send-dialog.tsx:60`

### `/api/admin/organizations/${organizationId}/members?page=${page}&limit=${limit}`
- `src/app/admin/_components/assign-roles-to-members/assign-roles-to-members.tsx:120`
- `src/app/admin/_components/organizations/members-table.tsx:113`

### `/api/admin/organizations/${organizationId}/members/${memberId}`
- `src/app/admin/_components/organizations/members-table.tsx:122`
- `src/app/admin/_components/organizations/members-table.tsx:135`

### `/api/admin/organizations/${organizationId}/roles`
- `src/app/admin/_components/organizations/member-add-dialog.tsx:54`
- `src/app/admin/_components/organizations/members-table.tsx:146`
- `src/app/admin/_components/organizations/organization-member-invitation-send-dialog.tsx:58`
- `src/app/admin/_components/organizations/organization-role-add-dialog.tsx:47`

### `/api/admin/organizations/${organizationId}/roles?page=${page}&limit=${limit}`
- `src/app/admin/_components/organizations/organization-role-table.tsx:74`

### `/api/admin/organizations/${organizationId}/roles/${roleId}`
- `src/app/admin/_components/organizations/organization-role-edit-dialog.tsx:69`
- `src/app/admin/_components/organizations/organization-role-table.tsx:83`

### `/api/admin/organizations/check-slug?slug=${slug}`
- `src/app/admin/_components/organizations/organization-add-dialog.tsx:42`

### `/api/admin/organizations/check-slug?slug=${slug}&excludeOrganizationId=${organizationId}`
- `src/app/admin/_components/organizations/organization-edit-dialog.tsx:62`

### `/api/admin/sessions?${params.toString()}`
- `src/app/admin/_components/sessions/sessions-table.tsx:143`

### `/api/admin/sessions/${token}`
- `src/app/admin/_components/sessions/session-revoke-dialog.tsx:24`

### `/api/admin/users?${params.toString()}`
- `src/app/admin/_components/users/users-table.tsx:113`

### `/api/admin/users?limit=${limit}`
- `src/app/admin/_components/organizations/member-add-dialog.tsx:55`
- `src/app/admin/_components/organizations/organization-member-invitation-send-dialog.tsx:59`

### `/api/admin/users/${userId}/sessions`
- `src/app/admin/_components/sessions/session-revoke-all-dialog.tsx:31`

## Indirect Better Auth Endpoint Usage
- Files in this scope call `authClient.*` and/or `auth.api.*`, which resolve through Better Auth base path `/api/auth` (see `src/config/authentication/profiles.ts`).
- Files with direct Better Auth API usage in this scope: 2.
- `src/app/admin/_components/dashboard/session-revoke-other-dialog.tsx`
- `src/app/admin/layout.tsx`
