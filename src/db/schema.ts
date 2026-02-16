import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  bigint,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  unique,
  uuid,
  foreignKey,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
const table = pgTable;

export const emailSourceEnum = pgEnum("email_source_enum", [
  "synthetic",
  "user_provided",
]);

export const user = table(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    username: text("username").unique(),
    displayUsername: text("display_username").unique(),
    phoneNumber: text("phone_number").unique(),
    phoneNumberVerified: boolean("phone_number_verified")
      .default(false)
      .notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    emailSource: emailSourceEnum("email_source")
      .default("user_provided")
      .notNull(),
    emailDeliverable: boolean("email_deliverable").default(true).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    role: text("role").default("user").notNull(),
    banned: boolean("banned").default(false).notNull(),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
  },
  (table) => [
    check("user_email_lowercase_chk", sql`${table.email} = lower(${table.email})`),
    check(
      "user_username_lowercase_chk",
      sql`${table.username} IS NULL OR ${table.username} = lower(${table.username})`,
    ),
    check(
      "user_phone_e164_chk",
      sql`${table.phoneNumber} IS NULL OR ${table.phoneNumber} ~ '^\\+[1-9][0-9]{7,14}$'`,
    ),
    check(
      "user_synthetic_email_deliverable_chk",
      sql`${table.emailSource} != 'synthetic' OR ${table.emailDeliverable} = false`,
    ),
  ],
);

export const session = table(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    activeOrganizationId: text("active_organization_id"),
    activeTeamId: text("active_team_id"),
  },
  (table) => [
    index("session_userId_idx").on(table.userId),
    index("session_expiresAt_idx").on(table.expiresAt),
  ],
);

export const account = table(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_userId_idx").on(table.userId),
    index("account_providerId_idx").on(table.providerId),
    uniqueIndex("account_provider_account_uidx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = table(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
    index("verification_identifier_value_idx").on(table.identifier, table.value),
    index("verification_expiresAt_idx").on(table.expiresAt),
  ],
);

export const rateLimit = table(
  "rate_limit",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    count: integer("count").notNull(),
    lastRequest: bigint("last_request", { mode: "number" }).notNull(),
  },
  (table) => [index("rateLimit_key_idx").on(table.key)],
);

export const passkey = table(
  "passkey",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    aaguid: text("aaguid"),
  },
  (table) => [
    index("passkey_userId_idx").on(table.userId),
    uniqueIndex("passkey_credentialID_uidx").on(table.credentialID),
  ],
);

export const jwks = table("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at").notNull(),
  expiresAt: timestamp("expires_at"),
});

export const oauthClient = table(
  "oauth_client",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull().unique(),
    clientSecret: text("client_secret"),
    disabled: boolean("disabled").default(false),
    skipConsent: boolean("skip_consent"),
    enableEndSession: boolean("enable_end_session"),
    scopes: text("scopes").array(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    name: text("name"),
    uri: text("uri"),
    icon: text("icon"),
    contacts: text("contacts").array(),
    tos: text("tos"),
    policy: text("policy"),
    softwareId: text("software_id"),
    softwareVersion: text("software_version"),
    softwareStatement: text("software_statement"),
    redirectUris: text("redirect_uris").array().notNull(),
    postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
    grantTypes: text("grant_types").array(),
    responseTypes: text("response_types").array(),
    public: boolean("public"),
    type: text("type"),
    referenceId: text("reference_id"),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("oauthClient_userId_idx").on(table.userId),
    index("oauthClient_clientId_idx").on(table.clientId),
  ],
);

export const oauthRefreshToken = table(
  "oauth_refresh_token",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => session.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revoked: timestamp("revoked"),
    scopes: text("scopes").array().notNull(),
  },
  (table) => [
    uniqueIndex("oauthRefreshToken_token_uidx").on(table.token),
    index("oauthRefreshToken_clientId_idx").on(table.clientId),
    index("oauthRefreshToken_sessionId_idx").on(table.sessionId),
    index("oauthRefreshToken_userId_idx").on(table.userId),
  ],
);

export const oauthAccessToken = table(
  "oauth_access_token",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => session.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    referenceId: text("reference_id"),
    refreshId: text("refresh_id").references(() => oauthRefreshToken.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    scopes: text("scopes").array().notNull(),
  },
  (table) => [
    index("oauthAccessToken_clientId_idx").on(table.clientId),
    index("oauthAccessToken_sessionId_idx").on(table.sessionId),
    index("oauthAccessToken_userId_idx").on(table.userId),
    index("oauthAccessToken_refreshId_idx").on(table.refreshId),
  ],
);

export const oauthConsent = table(
  "oauth_consent",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    referenceId: text("reference_id"),
    scopes: text("scopes").array().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("oauthConsent_clientId_idx").on(table.clientId),
    index("oauthConsent_userId_idx").on(table.userId),
  ],
);

export const twoFactor = table(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("twoFactor_userId_uidx").on(table.userId),
  ],
);

export const deviceCode = table(
  "device_code",
  {
    id: text("id").primaryKey(),
    deviceCode: text("device_code").notNull(),
    userCode: text("user_code").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at").notNull(),
    status: text("status").notNull(),
    lastPolledAt: timestamp("last_polled_at"),
    pollingInterval: integer("polling_interval"),
    clientId: text("client_id"),
    scope: text("scope"),
  },
  (table) => [
    uniqueIndex("deviceCode_deviceCode_uidx").on(table.deviceCode),
    uniqueIndex("deviceCode_userCode_uidx").on(table.userCode),
    index("deviceCode_userId_idx").on(table.userId),
  ],
);

export const subscription = table(
  "subscription",
  {
    id: text("id").primaryKey(),
    plan: text("plan").notNull(),
    referenceId: text("reference_id").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: text("status").default("incomplete"),
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    cancelAt: timestamp("cancel_at"),
    canceledAt: timestamp("canceled_at"),
    endedAt: timestamp("ended_at"),
    seats: integer("seats"),
  },
  (table) => [
    index("subscription_referenceId_idx").on(table.referenceId),
    index("subscription_stripeSubscriptionId_idx").on(
      table.stripeSubscriptionId,
    ),
  ],
);

export const ssoProvider = table(
  "sso_provider",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    oidcConfig: text("oidc_config"),
    samlConfig: text("saml_config"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    providerId: text("provider_id").notNull().unique(),
    organizationId: text("organization_id"),
    domain: text("domain").notNull(),
    domainVerified: boolean("domain_verified"),
  },
  (table) => [
    index("ssoProvider_userId_idx").on(table.userId),
    index("ssoProvider_organizationId_idx").on(table.organizationId),
    index("ssoProvider_domain_idx").on(table.domain),
  ],
);

export const scimProvider = table(
  "scim_provider",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id").notNull().unique(),
    scimToken: text("scim_token").notNull().unique(),
    organizationId: text("organization_id"),
  },
  (table) => [
    index("scimProvider_organizationId_idx").on(table.organizationId),
  ],
);

export const organization = table(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    metadata: text("metadata"),
    stripeCustomerId: text("stripe_customer_id"),
  },
  (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)],
);

export const organizationRole = table(
  "organization_role",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    permission: text("permission").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(
      () => /* @__PURE__ */ new Date(),
    ),
  },
  (table) => [
    index("organizationRole_organizationId_idx").on(table.organizationId),
    index("organizationRole_role_idx").on(table.role),
    uniqueIndex("organizationRole_organization_role_uidx").on(
      table.organizationId,
      table.role,
    ),
  ],
);

export const member = table(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
    uniqueIndex("member_organization_user_uidx").on(table.organizationId, table.userId),
  ],
);

export const invitation = table(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").default("member").notNull(),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => team.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
    index("invitation_inviterId_idx").on(table.inviterId),
    index("invitation_teamId_idx").on(table.teamId),
  ],
);

export const adminAuditLog = table(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("adminAuditLog_actorUserId_idx").on(table.actorUserId),
    index("adminAuditLog_action_idx").on(table.action),
    index("adminAuditLog_targetType_idx").on(table.targetType),
    index("adminAuditLog_createdAt_idx").on(table.createdAt),
  ],
);

export const userSecurityAuditLog = table(
  "user_security_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    targetUserId: text("target_user_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("userSecurityAuditLog_actorUserId_idx").on(table.actorUserId),
    index("userSecurityAuditLog_action_idx").on(table.action),
    index("userSecurityAuditLog_targetUserId_idx").on(table.targetUserId),
    index("userSecurityAuditLog_createdAt_idx").on(table.createdAt),
  ],
);

export const profileCompletion = table(
  "profile_completion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").default(1).notNull(),
    completed: boolean("completed").default(false).notNull(),
    completedAt: timestamp("completed_at"),
    stepIdentityData: jsonb("step_identity_data").$type<
      Record<string, unknown>
    >(),
    stepIdentitySkipped: boolean("step_identity_skipped")
      .default(false)
      .notNull(),
    stepIdentitySavedAt: timestamp("step_identity_saved_at"),
    stepSecurityData: jsonb("step_security_data").$type<
      Record<string, unknown>
    >(),
    stepSecuritySkipped: boolean("step_security_skipped")
      .default(false)
      .notNull(),
    stepSecuritySavedAt: timestamp("step_security_saved_at"),
    stepRecoveryData: jsonb("step_recovery_data").$type<
      Record<string, unknown>
    >(),
    stepRecoverySkipped: boolean("step_recovery_skipped")
      .default(false)
      .notNull(),
    stepRecoverySavedAt: timestamp("step_recovery_saved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("profileCompletion_userId_uidx").on(table.userId),
    index("profileCompletion_completed_idx").on(table.completed),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  passkeys: many(passkey),
  twoFactors: many(twoFactor),
  deviceCodes: many(deviceCode),
  ssoProviders: many(ssoProvider),
  members: many(member),
  invitations: many(invitation),
  adminAuditLogs: many(adminAuditLog),
  profileCompletions: many(profileCompletion),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id],
  }),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}));

export const deviceCodeRelations = relations(deviceCode, ({ one }) => ({
  user: one(user, {
    fields: [deviceCode.userId],
    references: [user.id],
  }),
}));

export const ssoProviderRelations = relations(ssoProvider, ({ one }) => ({
  user: one(user, {
    fields: [ssoProvider.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  organizationRoles: many(organizationRole),
  members: many(member),
  invitations: many(invitation),
  teams: many(team),
  applications: many(applications),
}));

export const organizationRoleRelations = relations(
  organizationRole,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationRole.organizationId],
      references: [organization.id],
    }),
  }),
);

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
  team: one(team, {
    fields: [invitation.teamId],
    references: [team.id],
  }),
}));

export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  actor: one(user, {
    fields: [adminAuditLog.actorUserId],
    references: [user.id],
  }),
}));

export const profileCompletionRelations = relations(
  profileCompletion,
  ({ one }) => ({
    user: one(user, {
      fields: [profileCompletion.userId],
      references: [user.id],
    }),
  }),
);

// =========================================================
// Team Tables (better-auth organization teams)
// =========================================================

export const team = table(
  "team",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    index("team_organizationId_idx").on(table.organizationId),
  ],
);

export const teamMember = table(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("teamMember_teamId_idx").on(table.teamId),
    index("teamMember_userId_idx").on(table.userId),
    uniqueIndex("teamMember_team_user_uidx").on(table.teamId, table.userId),
  ],
);

export const teamRelations = relations(team, ({ one, many }) => ({
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id],
  }),
  teamMembers: many(teamMember),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
}));

// =========================================================
// RBAC Extension Tables
// =========================================================

export const applications = table(
  "application",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    logo: text("logo"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "applications_key_format_chk",
      sql`${table.key} ~ '^[a-z0-9]+(_[a-z0-9]+)*$'`,
    ),
    index("idx_applications_org").on(table.organizationId),
    uniqueIndex("applications_organization_key_uniq").on(table.organizationId, table.key),
    uniqueIndex("applications_organization_name_uniq").on(table.organizationId, table.name),
  ],
);

export const resources = table(
  "resource",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "resources_key_format_chk",
      sql`${table.key} ~ '^[a-z0-9]+(_[a-z0-9]+)*$'`,
    ),
    index("idx_resources_application").on(table.applicationId),
    unique("uq_resources_id_application").on(table.id, table.applicationId),
    uniqueIndex("resources_application_key_uniq").on(table.applicationId, table.key),
    uniqueIndex("resources_application_name_uniq").on(table.applicationId, table.name),
  ],
);

export const actions = table(
  "action",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "actions_key_format_chk",
      sql`${table.key} ~ '^[a-z0-9]+(_[a-z0-9]+)*$'`,
    ),
    index("idx_actions_resource").on(table.resourceId),
    uniqueIndex("actions_resource_key_uniq").on(table.resourceId, table.key),
    uniqueIndex("actions_resource_name_uniq").on(table.resourceId, table.name),
  ],
);

export const applicationRoles = table(
  "application_role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "application_roles_key_format_chk",
      sql`${table.key} ~ '^[a-z0-9]+(_[a-z0-9]+)*$'`,
    ),
    index("idx_application_roles_application").on(table.applicationId),
    uniqueIndex("application_roles_application_key_uniq").on(table.applicationId, table.key),
    uniqueIndex("application_roles_application_name_uniq").on(table.applicationId, table.name),
  ],
);

export const applicationRoleAction = table(
  "application_role_action",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => applicationRoles.id, { onDelete: "cascade" }),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.actionId] }),
    index("idx_ara_role_id").on(table.roleId),
    index("idx_ara_action_id").on(table.actionId),
  ],
);

export const memberApplicationRoles = table(
  "member_application_role",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    applicationRoleId: uuid("application_role_id")
      .notNull()
      .references(() => applicationRoles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.memberId, table.applicationRoleId] }),
    index("idx_mar_member").on(table.memberId),
    index("idx_mar_role").on(table.applicationRoleId),
  ],
);

// =========================================================
// RBAC Relations
// =========================================================

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  organization: one(organization, {
    fields: [applications.organizationId],
    references: [organization.id],
  }),
  resources: many(resources),
  applicationRoles: many(applicationRoles),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  application: one(applications, {
    fields: [resources.applicationId],
    references: [applications.id],
  }),
  actions: many(actions),
}));

export const actionsRelations = relations(actions, ({ one, many }) => ({
  resource: one(resources, {
    fields: [actions.resourceId],
    references: [resources.id],
  }),
  roleActions: many(applicationRoleAction),
}));

export const applicationRolesRelations = relations(
  applicationRoles,
  ({ one, many }) => ({
    application: one(applications, {
      fields: [applicationRoles.applicationId],
      references: [applications.id],
    }),
    roleActions: many(applicationRoleAction),
    memberRoles: many(memberApplicationRoles),
  }),
);

export const applicationRoleActionRelations = relations(
  applicationRoleAction,
  ({ one }) => ({
    role: one(applicationRoles, {
      fields: [applicationRoleAction.roleId],
      references: [applicationRoles.id],
    }),
    action: one(actions, {
      fields: [applicationRoleAction.actionId],
      references: [actions.id],
    }),
  }),
);

export const memberApplicationRolesRelations = relations(
  memberApplicationRoles,
  ({ one }) => ({
    member: one(member, {
      fields: [memberApplicationRoles.memberId],
      references: [member.id],
    }),
    role: one(applicationRoles, {
      fields: [memberApplicationRoles.applicationRoleId],
      references: [applicationRoles.id],
    }),
  }),
);
