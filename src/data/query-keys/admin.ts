export const adminKeys = {
	apps: (key: string) => ["admin", "apps", "list", key] as const,
	app: (key: string | null | undefined) =>
		["admin", "apps", "detail", key ?? null] as const,
	appResources: (key: string | null | undefined) =>
		["admin", "apps", "resources", key ?? null] as const,
	appActions: (key: string | null | undefined) =>
		["admin", "apps", "actions", key ?? null] as const,
	resourceActions: (key: string | null | undefined) =>
		["admin", "apps", "resource-actions", key ?? null] as const,
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
	organizationAppRoles: (key: string | null | undefined) =>
		["admin", "organizations", "app-roles", key ?? null] as const,
	memberOrganizationAppRoles: (key: string | null | undefined) =>
		["admin", "organizations", "member-app-roles", key ?? null] as const,
	users: (key: string) => ["admin", "users", "list", key] as const,
	sessions: (key: string) => ["admin", "sessions", "list", key] as const,
};
