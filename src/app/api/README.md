# API Routes Documentation

This document provides a mapping of API routes to their usage in the application.

## Admin API Routes

### Users

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/users` | GET | `/admin/users` - `users-table.tsx`<br>`member-add-dialog.tsx` |
| `/api/admin/users/set-password` | POST | `/admin/users` - `user-password-dialog.tsx` |
| `/api/admin/users/send-verification-email` | POST | `/admin/users` - `user-email-dialog.tsx` |

### Organizations

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/organizations` | GET, POST, PUT, DELETE | `/admin/organizations` - `organizations-table.tsx`<br>`organization-application-selector.tsx`<br>`organization-add-dialog.tsx`<br>`organization-edit-dialog.tsx` |
| `/api/admin/organizations/[organizationId]` | GET | `dashboard-layout.tsx` |
| `/api/admin/organizations/[organizationId]/members` | GET, POST, DELETE, PUT | `/admin/organizations/[organizationId]/members` - `members-table.tsx`<br>`member-add-dialog.tsx` |
| `/api/admin/organizations/[organizationId]/roles` | GET, POST, DELETE, PUT | `/admin/organizations/[organizationId]/roles` - `organization-role-table.tsx`<br>`organization-role-add-dialog.tsx`<br>`organization-role-edit-dialog.tsx`<br>`member-add-dialog.tsx` |

### Applications

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/applications` | GET, POST | `/admin/applications` - `applications-table.tsx`<br>`organization-application-selector.tsx`<br>`dashboard-layout.tsx` |
| `/api/admin/applications/[applicationId]` | GET, PUT, DELETE | `applications-table.tsx`<br>`application-detail.tsx`<br>`dashboard-layout.tsx` |
| `/api/admin/applications/[applicationId]/actions` | GET | Fetch all actions for an application - `organization-application-roles-table.tsx` |

### Resources (Nested under Applications)

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/applications/[applicationId]/resources` | GET, POST | `/admin/applications/[applicationId]/resources` - `resources-table.tsx`<br>`application-detail.tsx`<br>`dashboard-layout.tsx`<br>`actions page.tsx` |
| `/api/admin/applications/[applicationId]/resources/[resourceId]` | GET, PUT, DELETE | `resources-table.tsx`<br>`application-detail.tsx` |

### Actions (Nested under Resources)

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/applications/[applicationId]/resources/[resourceId]/actions` | GET, POST | `/admin/applications/[applicationId]/resources/[resourceId]/actions` - `actions-table.tsx`<br>`application-detail.tsx` |
| `/api/admin/applications/[applicationId]/resources/[resourceId]/actions/[actionId]` | GET, PUT, DELETE | `actions-table.tsx`<br>`application-detail.tsx` |

### Organization Application Roles (Nested under Organization/Application)

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/organizations/[organizationId]/applications/[applicationId]/organization-application-roles` | GET, POST | `/admin/organization-application-roles` - `organization-application-roles-table.tsx`<br>`/admin/assign-roles-to-members` - `assign-roles-to-members.tsx` |
| `/api/admin/organizations/[organizationId]/applications/[applicationId]/organization-application-roles/[organizationApplicationRoleId]` | GET, PUT, DELETE | `organization-application-roles-table.tsx` |
| `/api/admin/organizations/[organizationId]/applications/[applicationId]/organization-application-roles/[organizationApplicationRoleId]/actions` | GET, PUT | `organization-application-roles-table.tsx` |

### Member Organization Application Roles (Per Organization/Application)

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/organizations/[organizationId]/applications/[applicationId]/member-organization-application-roles` | GET | `/admin/assign-roles-to-members` - `assign-roles-to-members.tsx` |
| `/api/admin/organizations/[organizationId]/applications/[applicationId]/members/[memberId]/organization-application-roles` | GET, POST, DELETE | `/admin/assign-roles-to-members` - `assign-roles-to-members.tsx` |

---

## Auth API Routes

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/auth/[...all]` | ALL | Better Auth handler - handles all authentication routes |

---

## User API Routes

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/user/send-verification-email` | POST | Future user verification flow (no UI yet) |

---

## RBAC API Routes (Runtime Permission Checks)

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/rbac/permissions/check` | GET | Runtime permission checking for applications |
| `/api/rbac/permissions` | GET | Fetch user permissions for applications |

---

## API Route Hierarchy

```
/api/admin/
├── users                                                                  # User management
│   ├── set-password                                                       # Admin set user password
│   └── send-verification-email                                            # Admin send verification email
├── organizations/                                                         # Organization management
│   └── [organizationId]/
│       ├── members                                                        # Organization members
│       ├── roles                                                          # Organization roles
│       └── applications/[applicationId]/
│           ├── organization-application-roles/                                    # Organization Application Roles
│           │   └── [organizationApplicationRoleId]/
│           │       └── actions                                            # Role action assignments
│           ├── member-organization-application-roles                              # Member role assignments
│           └── members/[memberId]/organization-application-roles                  # Individual member roles
└── applications/                                                          # Application management
    └── [applicationId]/
        ├── actions                                                        # All actions for an application
        └── resources/                                                     # Resource management
            └── [resourceId]/
                └── actions/                                               # Action management
                    └── [actionId]

/api/auth/
└── [...all]                                                               # Better Auth routes

/api/user/
└── send-verification-email                                                # User send verification email

/api/rbac/
└── permissions/                                                           # Get user permissions
    └── check                                                              # Permission checking
```

---

## Summary

| Category | Route Count |
|----------|-------------|
| Admin - Users | 3 |
| Admin - Organizations | 4 |
| Admin - Applications | 3 |
| Admin - Resources | 2 |
| Admin - Actions | 2 |
| Admin - Organization Application Roles | 5 |
| Auth | 1 |
| User | 1 |
| RBAC | 2 |
| **Total** | **23** |

---

## Future RBAC Improvement: Unified Permission Hierarchy

The current RBAC APIs (`/api/rbac/permissions` and `/api/rbac/permissions/check`) only check the bottom layer of permissions: **Organization Application Roles**.

For a complete and robust RBAC system, these APIs should be updated to resolve permissions across all three layers of the hierarchy:

### 1. Platform Role (Identity Level)
- **Source**: `user.role` (e.g., `"admin"`, `"user"`)
- **Logic**: A platform `"admin"` should inherently have **all permissions** across all organizations and applications.

### 2. Organization Role (Membership Level)
- **Source**: `member.role` (e.g., `"owner"`, `"admin"`, `"member"`)
- **Logic**: An organization `"owner"` or `"admin"` should usually imply **full access** to all applications within that organization, regardless of specific application role assignments.

### 3. Organization Application Role (Assignment Level)
- **Source**: `organization_application_roles` (Custom roles like "Editor", "Viewer")
- **Logic**: Fine-grained permissions explicitly assigned to a member for a specific application. This is the current implementation target.

### Proposed Resolution Logic

When checking `permissions/check` or listing `permissions`, the API should evaluate in order:

1. **Check Platform Admin**: If `user.role === 'admin'`, return `true` (allow everything).
2. **Check Organization Role**: If `member.role === 'owner'` (for the target organization), return `true` (allow everything for this organization's applications).
3. **Check Application Roles**: finally, query `organization_application_roles` tables for specific granular permissions (Current Implementation).
