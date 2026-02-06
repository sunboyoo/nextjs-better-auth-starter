CREATE TABLE "better_auth"."device_code" (
	"id" text PRIMARY KEY NOT NULL,
	"device_code" text NOT NULL,
	"user_code" text NOT NULL,
	"user_id" text,
	"expires_at" timestamp NOT NULL,
	"status" text NOT NULL,
	"last_polled_at" timestamp,
	"polling_interval" integer,
	"client_id" text,
	"scope" text
);
--> statement-breakpoint
CREATE TABLE "better_auth"."scim_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"scim_token" text NOT NULL,
	"organization_id" text,
	CONSTRAINT "scim_provider_provider_id_unique" UNIQUE("provider_id"),
	CONSTRAINT "scim_provider_scim_token_unique" UNIQUE("scim_token")
);
--> statement-breakpoint
CREATE TABLE "better_auth"."sso_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"oidc_config" text,
	"saml_config" text,
	"user_id" text,
	"provider_id" text NOT NULL,
	"organization_id" text,
	"domain" text NOT NULL,
	"domain_verified" boolean,
	CONSTRAINT "sso_provider_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "better_auth"."subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'incomplete',
	"period_start" timestamp,
	"period_end" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancel_at" timestamp,
	"canceled_at" timestamp,
	"ended_at" timestamp,
	"seats" integer
);
--> statement-breakpoint
CREATE TABLE "better_auth"."two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "better_auth"."organization" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "better_auth"."user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "better_auth"."user" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "better_auth"."device_code" ADD CONSTRAINT "device_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."sso_provider" ADD CONSTRAINT "sso_provider_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "better_auth"."two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deviceCode_deviceCode_uidx" ON "better_auth"."device_code" USING btree ("device_code");--> statement-breakpoint
CREATE UNIQUE INDEX "deviceCode_userCode_uidx" ON "better_auth"."device_code" USING btree ("user_code");--> statement-breakpoint
CREATE INDEX "deviceCode_userId_idx" ON "better_auth"."device_code" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scimProvider_organizationId_idx" ON "better_auth"."scim_provider" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ssoProvider_userId_idx" ON "better_auth"."sso_provider" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ssoProvider_organizationId_idx" ON "better_auth"."sso_provider" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ssoProvider_domain_idx" ON "better_auth"."sso_provider" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "subscription_referenceId_idx" ON "better_auth"."subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_stripeSubscriptionId_idx" ON "better_auth"."subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "better_auth"."two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "better_auth"."two_factor" USING btree ("user_id");