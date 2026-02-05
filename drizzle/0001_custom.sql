-- =========================================================
-- RBAC Utility Functions
-- =========================================================

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint

-- =========================================================
-- Trigger function for auto-updating updated_at column
-- =========================================================
CREATE OR REPLACE FUNCTION "better_auth".update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- =========================================================
-- Member composite unique index
-- (Moved to schema.ts; no custom SQL required)
-- =========================================================

-- =========================================================
-- RBAC updated_at triggers
-- =========================================================
CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON "better_auth".apps
  FOR EACH ROW EXECUTE FUNCTION "better_auth".update_updated_at_column();
--> statement-breakpoint

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON "better_auth".resources
  FOR EACH ROW EXECUTE FUNCTION "better_auth".update_updated_at_column();
--> statement-breakpoint

CREATE TRIGGER update_actions_updated_at
  BEFORE UPDATE ON "better_auth".actions
  FOR EACH ROW EXECUTE FUNCTION "better_auth".update_updated_at_column();
--> statement-breakpoint

CREATE TRIGGER update_org_app_roles_updated_at
  BEFORE UPDATE ON "better_auth".organization_app_roles
  FOR EACH ROW EXECUTE FUNCTION "better_auth".update_updated_at_column();
