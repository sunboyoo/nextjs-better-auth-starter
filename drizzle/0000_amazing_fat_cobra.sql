CREATE TABLE "better_auth"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "better_auth"."actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actions_key_format_chk" CHECK ("better_auth"."actions"."key" ~ '^[a-z0-9]+(_[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "better_auth"."apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apps_key_unique" UNIQUE("key"),
	CONSTRAINT "apps_name_unique" UNIQUE("name"),
	CONSTRAINT "apps_key_format_chk" CHECK ("better_auth"."apps"."key" ~ '^[a-z0-9]+(_[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "better_auth"."invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "better_auth"."member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "better_auth"."member_organization_app_roles" (
	"member_id" text NOT NULL,
	"organization_app_role_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_organization_app_roles_member_id_organization_app_role_id_pk" PRIMARY KEY("member_id","organization_app_role_id")
);
--> statement-breakpoint
CREATE TABLE "better_auth"."organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "better_auth"."organization_app_role_action" (
	"role_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_app_role_action_role_id_action_id_pk" PRIMARY KEY("role_id","action_id")
);
--> statement-breakpoint
CREATE TABLE "better_auth"."organization_app_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"app_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_app_roles_key_format_chk" CHECK ("better_auth"."organization_app_roles"."key" ~ '^[a-z0-9]+(_[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "better_auth"."organization_role" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "better_auth"."resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_key_format_chk" CHECK ("better_auth"."resources"."key" ~ '^[a-z0-9]+(_[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "better_auth"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "better_auth"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "better_auth"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX "uq_resources_id_app" ON "better_auth"."resources" USING btree ("id","app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_app_key_uniq" ON "better_auth"."resources" USING btree ("app_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_app_name_uniq" ON "better_auth"."resources" USING btree ("app_id","name");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "better_auth"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_actions_app" ON "better_auth"."actions" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_actions_resource" ON "better_auth"."actions" USING btree ("resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_actions_id_app" ON "better_auth"."actions" USING btree ("id","app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "actions_resource_key_uniq" ON "better_auth"."actions" USING btree ("resource_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "actions_resource_name_uniq" ON "better_auth"."actions" USING btree ("resource_id","name");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "better_auth"."invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "better_auth"."invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "better_auth"."member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "better_auth"."member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_member_id_org" ON "better_auth"."member" USING btree ("id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_moar_org" ON "better_auth"."member_organization_app_roles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_moar_app" ON "better_auth"."member_organization_app_roles" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_moar_member" ON "better_auth"."member_organization_app_roles" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_moar_role" ON "better_auth"."member_organization_app_roles" USING btree ("organization_app_role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "better_auth"."organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_oara_role_id" ON "better_auth"."organization_app_role_action" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_oara_action_id" ON "better_auth"."organization_app_role_action" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "idx_oara_app_id" ON "better_auth"."organization_app_role_action" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_org_app_roles_org" ON "better_auth"."organization_app_roles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_app_roles_app" ON "better_auth"."organization_app_roles" USING btree ("app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_app_roles_id_app" ON "better_auth"."organization_app_roles" USING btree ("id","app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_app_roles_id_org" ON "better_auth"."organization_app_roles" USING btree ("id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_app_roles_scope_key_uniq" ON "better_auth"."organization_app_roles" USING btree ("organization_id","app_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "org_app_roles_scope_name_uniq" ON "better_auth"."organization_app_roles" USING btree ("organization_id","app_id","name");--> statement-breakpoint
CREATE INDEX "organizationRole_organizationId_idx" ON "better_auth"."organization_role" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organizationRole_role_idx" ON "better_auth"."organization_role" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_resources_app" ON "better_auth"."resources" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "better_auth"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "better_auth"."verification" USING btree ("identifier");--> statement-breakpoint

ALTER TABLE "better_auth"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."actions" ADD CONSTRAINT "actions_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "better_auth"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."actions" ADD CONSTRAINT "actions_resource_fk" FOREIGN KEY ("resource_id","app_id") REFERENCES "better_auth"."resources"("id","app_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "better_auth"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "better_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "better_auth"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."member_organization_app_roles" ADD CONSTRAINT "member_organization_app_roles_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "better_auth"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."member_organization_app_roles" ADD CONSTRAINT "member_organization_app_roles_organization_app_role_id_organization_app_roles_id_fk" FOREIGN KEY ("organization_app_role_id") REFERENCES "better_auth"."organization_app_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."member_organization_app_roles" ADD CONSTRAINT "member_organization_app_roles_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "better_auth"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."member_organization_app_roles" ADD CONSTRAINT "member_organization_app_roles_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "better_auth"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."member_organization_app_roles" ADD CONSTRAINT "moar_role_org_fk" FOREIGN KEY ("organization_app_role_id","organization_id") REFERENCES "better_auth"."organization_app_roles"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."member_organization_app_roles" ADD CONSTRAINT "moar_role_app_fk" FOREIGN KEY ("organization_app_role_id","app_id") REFERENCES "better_auth"."organization_app_roles"("id","app_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."member_organization_app_roles" ADD CONSTRAINT "moar_member_org_fk" FOREIGN KEY ("member_id","organization_id") REFERENCES "better_auth"."member"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."organization_app_role_action" ADD CONSTRAINT "organization_app_role_action_role_id_organization_app_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "better_auth"."organization_app_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."organization_app_role_action" ADD CONSTRAINT "organization_app_role_action_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "better_auth"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."organization_app_role_action" ADD CONSTRAINT "organization_app_role_action_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "better_auth"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."organization_app_role_action" ADD CONSTRAINT "oara_role_fk" FOREIGN KEY ("role_id","app_id") REFERENCES "better_auth"."organization_app_roles"("id","app_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."organization_app_role_action" ADD CONSTRAINT "oara_action_fk" FOREIGN KEY ("action_id","app_id") REFERENCES "better_auth"."actions"("id","app_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."organization_app_roles" ADD CONSTRAINT "organization_app_roles_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "better_auth"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."organization_app_roles" ADD CONSTRAINT "organization_app_roles_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "better_auth"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."organization_role" ADD CONSTRAINT "organization_role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "better_auth"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."resources" ADD CONSTRAINT "resources_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "better_auth"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE cascade ON UPDATE no action;