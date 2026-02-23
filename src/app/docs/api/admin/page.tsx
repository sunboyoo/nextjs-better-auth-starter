import type { Metadata } from "next";
import { ApiReferencePage } from "@/components/docs/api-reference-page";
import { getApiDocsPageData } from "@/lib/api-docs";

export const metadata: Metadata = {
  title: "Admin API Docs",
  description:
    "Endpoints used by /admin and API routes designed for user.role=admin.",
};

export default async function AdminApiDocsPage() {
  const data = await getApiDocsPageData({
    appScope: "admin",
    roleScope: "admin",
  });

  return (
    <ApiReferencePage
      title="Admin API Reference"
      description="Reference for platform developers integrating administrative workflows and admin-role API routes."
      usageHeading="Endpoints Used by /admin"
      usageDescription="Detected from endpoint literals in src/app/admin/** plus indirect Better Auth usage."
      designedHeading='Endpoints Designed for user.role = "admin"'
      designedDescription="Extracted from src/app/api/admin/** route handlers and their exported HTTP methods."
      siblingHref="/docs/api/user"
      siblingLabel="User API Reference"
      data={data}
    />
  );
}
