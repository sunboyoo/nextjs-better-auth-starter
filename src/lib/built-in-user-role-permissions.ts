import { defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Built-in user roles for the application.
 * These roles correspond to the default roles used by the better-auth admin plugin.
 */
export const BUILT_IN_USER_ROLES = [
    {
        id: "admin",
        role: "admin",
        description: "Administrator with full access to manage users, sessions, and system settings.",
        permissions: {
            ...defaultStatements,
        },
        isBuiltIn: true,
    },
    {
        id: "user",
        role: "user",
        description: "Standard user with access to their own account and public resources.",
        permissions: {},
        isBuiltIn: true,
    },
] as const;
