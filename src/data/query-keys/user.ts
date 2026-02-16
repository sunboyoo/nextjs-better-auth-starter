export const userKeys = {
    organizationApplications: (organizationId: string, search?: string) =>
        ["user", "organizations", organizationId, "applications", search ?? ""] as const,
    organizationApplication: (organizationId: string, applicationId: string) =>
        ["user", "organizations", organizationId, "applications", applicationId] as const,
    organizationApplicationResources: (organizationId: string, applicationId: string, search?: string) =>
        ["user", "organizations", organizationId, "applications", applicationId, "resources", search ?? ""] as const,
    organizationApplicationResource: (organizationId: string, applicationId: string, resourceId: string) =>
        ["user", "organizations", organizationId, "applications", applicationId, "resources", resourceId] as const,
    organizationApplicationResourceActions: (organizationId: string, applicationId: string, resourceId: string, search?: string) =>
        ["user", "organizations", organizationId, "applications", applicationId, "resources", resourceId, "actions", search ?? ""] as const,
    organizationApplicationResourceAction: (organizationId: string, applicationId: string, resourceId: string, actionId: string) =>
        ["user", "organizations", organizationId, "applications", applicationId, "resources", resourceId, "actions", actionId] as const,
    teamDetail: (organizationId: string, teamId: string) =>
        ["user", "organizations", organizationId, "teams", teamId] as const,
    teamMembers: (organizationId: string, teamId: string) =>
        ["user", "organizations", organizationId, "teams", teamId, "members"] as const,
    teamMember: (organizationId: string, teamId: string, teamMemberId: string) =>
        ["user", "organizations", organizationId, "teams", teamId, "members", teamMemberId] as const,
};
