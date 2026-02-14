export const userKeys = {
    orgApps: (organizationId: string, search?: string) =>
        ["user", "organizations", organizationId, "apps", search ?? ""] as const,
};
