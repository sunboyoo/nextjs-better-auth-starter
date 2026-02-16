export const adminKeys = {
	applications: (key: string) => ["admin", "applications", "list", key] as const,
	application: (key: string | null | undefined) =>
		["admin", "applications", "detail", key ?? null] as const,
	applicationResources: (key: string | null | undefined) =>
		["admin", "applications", "resources", key ?? null] as const,
	applicationActions: (key: string | null | undefined) =>
		["admin", "applications", "actions", key ?? null] as const,
	resourceActions: (key: string | null | undefined) =>
		["admin", "applications", "resource-actions", key ?? null] as const,
	organizations: (key: string) =>
		["admin", "organizations", "list", key] as const,
	organization: (key: string | null | undefined) =>
		["admin", "organizations", "detail", key ?? null] as const,
	organizationMembers: (key: string | null | undefined) =>
		["admin", "organizations", "members", key ?? null] as const,
	organizationRoles: (key: string | null | undefined) =>
		["admin", "organizations", "roles", key ?? null] as const,
	organizationInvitations: (key: string) =>
		["admin", "organizations", "invitations", key] as const,
	applicationRoles: (key: string | null | undefined) =>
		["admin", "organizations", "application-roles", key ?? null] as const,
	memberApplicationRoles: (key: string | null | undefined) =>
		["admin", "organizations", "member-application-roles", key ?? null] as const,
	users: (key: string) => ["admin", "users", "list", key] as const,
	sessions: (key: string) => ["admin", "sessions", "list", key] as const,
};
