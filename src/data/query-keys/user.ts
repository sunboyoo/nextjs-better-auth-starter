export const userKeys = {
    orgApps: (organizationId: string, search?: string) =>
        ["user", "organizations", organizationId, "apps", search ?? ""] as const,
    orgApp: (organizationId: string, appId: string) =>
        ["user", "organizations", organizationId, "apps", appId] as const,
    orgAppResources: (organizationId: string, appId: string, search?: string) =>
        ["user", "organizations", organizationId, "apps", appId, "resources", search ?? ""] as const,
    orgAppResource: (organizationId: string, appId: string, resourceId: string) =>
        ["user", "organizations", organizationId, "apps", appId, "resources", resourceId] as const,
    orgAppResourceActions: (organizationId: string, appId: string, resourceId: string, search?: string) =>
        ["user", "organizations", organizationId, "apps", appId, "resources", resourceId, "actions", search ?? ""] as const,
    orgAppResourceAction: (organizationId: string, appId: string, resourceId: string, actionId: string) =>
        ["user", "organizations", organizationId, "apps", appId, "resources", resourceId, "actions", actionId] as const,
    teamDetail: (organizationId: string, teamId: string) =>
        ["user", "organizations", organizationId, "teams", teamId] as const,
    teamMembers: (organizationId: string, teamId: string) =>
        ["user", "organizations", organizationId, "teams", teamId, "members"] as const,
    teamMember: (organizationId: string, teamId: string, teamMemberId: string) =>
        ["user", "organizations", organizationId, "teams", teamId, "members", teamMemberId] as const,
};
