import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
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

export const user = table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username").unique(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = table(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
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
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
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
  (table) => [index("verification_identifier_idx").on(table.identifier)],
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
    index("passkey_credentialID_idx").on(table.credentialID),
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
    token: text("token").unique(),
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
    index("twoFactor_secret_idx").on(table.secret),
    index("twoFactor_userId_idx").on(table.userId),
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
    index("subscription_stripeSubscriptionId_idx").on(table.stripeSubscriptionId),
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
    unique("uq_member_id_org").on(table.id, table.organizationId),
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
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
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
}));

// =========================================================
// RBAC Extension Tables
// =========================================================

export const apps = table(
  "apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    name: text("name").notNull().unique(),
    description: text("description"),
    logo: text("logo"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "apps_key_format_chk",
      sql`${table.key} ~ '^[a-z0-9]+(_[a-z0-9]+)*$'`,
    ),
  ],
);

export const resources = table(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
    index("idx_resources_app").on(table.appId),
    unique("uq_resources_id_app").on(table.id, table.appId),
    uniqueIndex("resources_app_key_uniq").on(table.appId, table.key),
    uniqueIndex("resources_app_name_uniq").on(table.appId, table.name),
  ],
);

export const actions = table(
  "actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id").notNull(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
    index("idx_actions_app").on(table.appId),
    index("idx_actions_resource").on(table.resourceId),
    unique("uq_actions_id_app").on(table.id, table.appId),
    uniqueIndex("actions_resource_key_uniq").on(table.resourceId, table.key),
    uniqueIndex("actions_resource_name_uniq").on(table.resourceId, table.name),
    foreignKey({
      columns: [table.resourceId, table.appId],
      foreignColumns: [resources.id, resources.appId],
      name: "actions_resource_fk",
    }).onDelete("cascade"),
  ],
);

export const organizationAppRoles = table(
  "organization_app_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "org_app_roles_key_format_chk",
      sql`${table.key} ~ '^[a-z0-9]+(_[a-z0-9]+)*$'`,
    ),
    index("idx_org_app_roles_org").on(table.organizationId),
    index("idx_org_app_roles_app").on(table.appId),
    unique("uq_org_app_roles_id_app").on(table.id, table.appId),
    unique("uq_org_app_roles_id_org").on(table.id, table.organizationId),
    uniqueIndex("org_app_roles_scope_key_uniq").on(table.organizationId, table.appId, table.key),
    uniqueIndex("org_app_roles_scope_name_uniq").on(table.organizationId, table.appId, table.name),
  ],
);

export const organizationAppRoleAction = table(
  "organization_app_role_action",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => organizationAppRoles.id, { onDelete: "cascade" }),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actions.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.actionId] }),
    index("idx_oara_role_id").on(table.roleId),
    index("idx_oara_action_id").on(table.actionId),
    index("idx_oara_app_id").on(table.appId),
    foreignKey({
      columns: [table.roleId, table.appId],
      foreignColumns: [organizationAppRoles.id, organizationAppRoles.appId],
      name: "oara_role_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.actionId, table.appId],
      foreignColumns: [actions.id, actions.appId],
      name: "oara_action_fk",
    }).onDelete("cascade"),
  ],
);

export const memberOrganizationAppRoles = table(
  "member_organization_app_roles",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    organizationAppRoleId: uuid("organization_app_role_id")
      .notNull()
      .references(() => organizationAppRoles.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.memberId, table.organizationAppRoleId] }),
    index("idx_moar_org").on(table.organizationId),
    index("idx_moar_app").on(table.appId),
    index("idx_moar_member").on(table.memberId),
    index("idx_moar_role").on(table.organizationAppRoleId),
    foreignKey({
      columns: [table.organizationAppRoleId, table.organizationId],
      foreignColumns: [organizationAppRoles.id, organizationAppRoles.organizationId],
      name: "moar_role_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationAppRoleId, table.appId],
      foreignColumns: [organizationAppRoles.id, organizationAppRoles.appId],
      name: "moar_role_app_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.memberId, table.organizationId],
      foreignColumns: [member.id, member.organizationId],
      name: "moar_member_org_fk",
    }).onDelete("cascade"),
  ],
);

// =========================================================
// RBAC Relations
// =========================================================

export const appsRelations = relations(apps, ({ many }) => ({
  resources: many(resources),
  organizationAppRoles: many(organizationAppRoles),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  app: one(apps, {
    fields: [resources.appId],
    references: [apps.id],
  }),
  actions: many(actions),
}));

export const actionsRelations = relations(actions, ({ one, many }) => ({
  app: one(apps, {
    fields: [actions.appId],
    references: [apps.id],
  }),
  resource: one(resources, {
    fields: [actions.resourceId],
    references: [resources.id],
  }),
  roleActions: many(organizationAppRoleAction),
}));

export const organizationAppRolesRelations = relations(organizationAppRoles, ({ one, many }) => ({
  organization: one(organization, {
    fields: [organizationAppRoles.organizationId],
    references: [organization.id],
  }),
  app: one(apps, {
    fields: [organizationAppRoles.appId],
    references: [apps.id],
  }),
  roleActions: many(organizationAppRoleAction),
  memberRoles: many(memberOrganizationAppRoles),
}));

export const organizationAppRoleActionRelations = relations(organizationAppRoleAction, ({ one }) => ({
  role: one(organizationAppRoles, {
    fields: [organizationAppRoleAction.roleId],
    references: [organizationAppRoles.id],
  }),
  action: one(actions, {
    fields: [organizationAppRoleAction.actionId],
    references: [actions.id],
  }),
  app: one(apps, {
    fields: [organizationAppRoleAction.appId],
    references: [apps.id],
  }),
}));

export const memberOrganizationAppRolesRelations = relations(memberOrganizationAppRoles, ({ one }) => ({
  member: one(member, {
    fields: [memberOrganizationAppRoles.memberId],
    references: [member.id],
  }),
  role: one(organizationAppRoles, {
    fields: [memberOrganizationAppRoles.organizationAppRoleId],
    references: [organizationAppRoles.id],
  }),
  organization: one(organization, {
    fields: [memberOrganizationAppRoles.organizationId],
    references: [organization.id],
  }),
  app: one(apps, {
    fields: [memberOrganizationAppRoles.appId],
    references: [apps.id],
  }),
}));
