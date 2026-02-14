import { auth } from "@/lib/auth";

export type PermissionStatements = Record<string, string[]>;

type PermissionBody = {
  permission?: PermissionStatements;
  permissions?: PermissionStatements;
};

export type ExtendedAuthApi = {
  // Admin plugin endpoints
  createUser: (input: {
    body: {
      name: string;
      email: string;
      password?: string;
      role?: string | string[];
      data?: Record<string, unknown>;
    };
    headers: Headers;
  }) => Promise<unknown>;
  banUser: (input: {
    body: { userId: string; banReason?: string; banExpiresIn?: number };
    headers: Headers;
  }) => Promise<unknown>;
  unbanUser: (input: {
    body: { userId: string };
    headers: Headers;
  }) => Promise<unknown>;
  setRole: (input: {
    body: { userId: string; role: string | string[] };
    headers: Headers;
  }) => Promise<unknown>;
  adminUpdateUser: (input: {
    body: { userId: string; data: Record<string, unknown> };
    headers: Headers;
  }) => Promise<unknown>;
  removeUser: (input: {
    body: { userId: string };
    headers: Headers;
  }) => Promise<unknown>;
  setUserPassword: (input: {
    body: { userId: string; newPassword: string };
    headers: Headers;
  }) => Promise<{ status: boolean }>;
  revokeUserSession: (input: {
    body: { sessionToken: string };
    headers: Headers;
  }) => Promise<{ success: boolean } | unknown>;
  listUserSessions: (input: {
    body: { userId: string };
    headers: Headers;
  }) => Promise<{ sessions: unknown[] } | unknown>;
  revokeUserSessions: (input: {
    body: { userId: string };
    headers: Headers;
  }) => Promise<{ success: boolean } | unknown>;
  impersonateUser: (input: {
    body: { userId: string };
    headers: Headers;
  }) => Promise<unknown>;
  stopImpersonating: (input: { headers: Headers }) => Promise<unknown>;
  userHasPermission: (input: {
    body: {
      userId?: string;
      role?: string;
    } & PermissionBody;
    headers: Headers;
  }) => Promise<{ success: boolean; error: null } | { success: false; error: string }>;

  // Organization plugin endpoints
  listOrganizations: (input: {
    headers: Headers;
  }) => Promise<unknown>;
  createOrganization: (input: {
    body: { name: string; slug?: string; logo?: string | null; metadata?: string | null };
    headers: Headers;
  }) => Promise<unknown>;
  getFullOrganization: (input: {
    query: { organizationId?: string };
    headers: Headers;
  }) => Promise<unknown>;
  updateOrganization: (input: {
    body: {
      organizationId?: string;
      data: {
        name?: string;
        slug?: string;
        logo?: string | null;
        metadata?: string | null;
      };
    };
    headers: Headers;
  }) => Promise<unknown>;
  deleteOrganization: (input: {
    body: { organizationId?: string };
    headers: Headers;
  }) => Promise<unknown>;
  listMembers: (input: {
    query: { organizationId?: string };
    headers: Headers;
  }) => Promise<unknown>;
  addMember: (input: {
    body: { organizationId?: string; userId: string; role?: string };
    headers: Headers;
  }) => Promise<unknown>;
  removeMember: (input: {
    body: { organizationId?: string; memberIdOrEmail: string };
    headers: Headers;
  }) => Promise<unknown>;
  updateMemberRole: (input: {
    body: {
      organizationId?: string;
      memberId: string;
      role: string | string[];
    };
    headers: Headers;
  }) => Promise<unknown>;
  listOrgRoles: (input: {
    query: { organizationId?: string };
    headers: Headers;
  }) => Promise<unknown>;
  createOrgRole: (input: {
    body: {
      organizationId?: string;
      role: string;
      permission?: PermissionStatements;
    };
    headers: Headers;
  }) => Promise<unknown>;
  updateOrgRole: (input: {
    body: {
      organizationId?: string;
      roleId?: string;
      roleName?: string;
      data: {
        role?: string;
        permission?: PermissionStatements;
      };
    };
    headers: Headers;
  }) => Promise<unknown>;
  deleteOrgRole: (input: {
    body: {
      organizationId?: string;
      roleId?: string;
      roleName?: string;
    };
    headers: Headers;
  }) => Promise<unknown>;
  getOrgRole: (input: {
    query: {
      organizationId?: string;
      roleId?: string;
      roleName?: string;
    };
    headers: Headers;
  }) => Promise<unknown>;
  listInvitations: (input: {
    query: { organizationId?: string };
    headers: Headers;
  }) => Promise<unknown>;
  createInvitation: (input: {
    body: {
      email: string;
      role: string | string[];
      organizationId?: string;
      resend?: boolean;
      teamId?: string;
    };
    headers: Headers;
  }) => Promise<unknown>;
  cancelInvitation: (input: {
    body: { invitationId: string };
    headers: Headers;
  }) => Promise<unknown>;
  hasPermission: (input: {
    body: {
      organizationId?: string;
    } & PermissionBody;
    headers: Headers;
  }) => Promise<{ success: boolean; error: null } | { success: false; error: string }>;
  checkOrganizationSlug: (input: {
    query: { slug: string };
    headers: Headers;
  }) => Promise<unknown>;

  // Team endpoints (organization teams feature)
  createTeam: (input: {
    body: { name: string; organizationId?: string };
    headers: Headers;
  }) => Promise<unknown>;
  listOrganizationTeams: (input: {
    query: { organizationId?: string };
    headers: Headers;
  }) => Promise<unknown>;
  updateTeam: (input: {
    body: { teamId: string; data: { name?: string } };
    headers: Headers;
  }) => Promise<unknown>;
  removeTeam: (input: {
    body: { teamId: string; organizationId?: string };
    headers: Headers;
  }) => Promise<unknown>;
  listTeamMembers: (input: {
    query: { teamId?: string };
    headers: Headers;
  }) => Promise<unknown>;
  addTeamMember: (input: {
    body: { teamId: string; userId: string };
    headers: Headers;
  }) => Promise<unknown>;
  removeTeamMember: (input: {
    body: { teamId: string; userId: string };
    headers: Headers;
  }) => Promise<unknown>;
};

export const extendedAuthApi = auth.api as unknown as ExtendedAuthApi;
