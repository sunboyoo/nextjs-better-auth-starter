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
| `/api/admin/organizations` | GET, POST, PUT, DELETE | `/admin/organizations` - `organizations-table.tsx`<br>`org-app-selector.tsx`<br>`organization-add-dialog.tsx`<br>`organization-edit-dialog.tsx` |
| `/api/admin/organizations/[organizationId]` | GET | `dashboard-layout.tsx` |
| `/api/admin/organizations/[organizationId]/members` | GET, POST, DELETE, PUT | `/admin/organizations/[organizationId]/members` - `members-table.tsx`<br>`member-add-dialog.tsx` |
| `/api/admin/organizations/[organizationId]/roles` | GET, POST, DELETE, PUT | `/admin/organizations/[organizationId]/roles` - `organization-role-table.tsx`<br>`organization-role-add-dialog.tsx`<br>`organization-role-edit-dialog.tsx`<br>`member-add-dialog.tsx` |

### Apps

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/apps` | GET, POST | `/admin/apps` - `apps-table.tsx`<br>`org-app-selector.tsx`<br>`dashboard-layout.tsx` |
| `/api/admin/apps/[appId]` | GET, PUT, DELETE | `apps-table.tsx`<br>`app-detail.tsx`<br>`dashboard-layout.tsx` |
| `/api/admin/apps/[appId]/actions` | GET | Fetch all actions for an app - `organization-app-roles-table.tsx` |

### Resources (Nested under Apps)

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/apps/[appId]/resources` | GET, POST | `/admin/apps/[appId]/resources` - `resources-table.tsx`<br>`app-detail.tsx`<br>`dashboard-layout.tsx`<br>`actions page.tsx` |
| `/api/admin/apps/[appId]/resources/[resourceId]` | GET, PUT, DELETE | `resources-table.tsx`<br>`app-detail.tsx` |

### Actions (Nested under Resources)

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/apps/[appId]/resources/[resourceId]/actions` | GET, POST | `/admin/apps/[appId]/resources/[resourceId]/actions` - `actions-table.tsx`<br>`app-detail.tsx` |
| `/api/admin/apps/[appId]/resources/[resourceId]/actions/[actionId]` | GET, PUT, DELETE | `actions-table.tsx`<br>`app-detail.tsx` |

### Organization App Roles (Nested under Organization/App)

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles` | GET, POST | `/admin/organization-app-roles` - `organization-app-roles-table.tsx`<br>`/admin/assign-roles-to-members` - `assign-roles-to-members.tsx` |
| `/api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles/[organizationAppRoleId]` | GET, PUT, DELETE | `organization-app-roles-table.tsx` |
| `/api/admin/organizations/[organizationId]/apps/[appId]/organization-app-roles/[organizationAppRoleId]/actions` | GET, PUT | `organization-app-roles-table.tsx` |

### Member Organization App Roles (Per Organization/App)

| API Route | Methods | Used By |
|-----------|---------|---------|
| `/api/admin/organizations/[organizationId]/apps/[appId]/member-organization-app-roles` | GET | `/admin/assign-roles-to-members` - `assign-roles-to-members.tsx` |
| `/api/admin/organizations/[organizationId]/apps/[appId]/members/[memberId]/organization-app-roles` | GET, POST, DELETE | `/admin/assign-roles-to-members` - `assign-roles-to-members.tsx` |

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
│       └── apps/[appId]/
│           ├── organization-app-roles/                                    # Organization App Roles
│           │   └── [organizationAppRoleId]/
│           │       └── actions                                            # Role action assignments
│           ├── member-organization-app-roles                              # Member role assignments
│           └── members/[memberId]/organization-app-roles                  # Individual member roles
└── apps/                                                                  # App management
    └── [appId]/
        ├── actions                                                        # All actions for an app
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
| Admin - Apps | 3 |
| Admin - Resources | 2 |
| Admin - Actions | 2 |
| Admin - Organization App Roles | 5 |
| Auth | 1 |
| User | 1 |
| RBAC | 2 |
| **Total** | **23** |

---

## Future RBAC Improvement: Unified Permission Hierarchy

The current RBAC APIs (`/api/rbac/permissions` and `/api/rbac/permissions/check`) only check the bottom layer of permissions: **Organization App Roles**.

For a complete and robust RBAC system, these APIs should be updated to resolve permissions across all three layers of the hierarchy:

### 1. Platform Role (Identity Level)
- **Source**: `user.role` (e.g., `"admin"`, `"user"`)
- **Logic**: A platform `"admin"` should inherently have **all permissions** across all organizations and apps.

### 2. Organization Role (Membership Level)
- **Source**: `member.role` (e.g., `"owner"`, `"admin"`, `"member"`)
- **Logic**: An organization `"owner"` or `"admin"` should usually imply **full access** to all apps within that organization, regardless of specific app role assignments.

### 3. Organization App Role (Assignment Level)
- **Source**: `organization_app_roles` (Custom roles like "Editor", "Viewer")
- **Logic**: Fine-grained permissions explicitly assigned to a member for a specific app. This is the current implementation target.

### Proposed Resolution Logic

When checking `permissions/check` or listing `permissions`, the API should evaluate in order:

1. **Check Platform Admin**: If `user.role === 'admin'`, return `true` (allow everything).
2. **Check Org Role**: If `member.role === 'owner'` (for the target org), return `true` (allow everything for this org's apps).
3. **Check App Roles**: finally, query `organization_app_roles` tables for specific granular permissions (Current Implementation).
