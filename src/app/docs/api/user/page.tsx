import type { Metadata } from "next";
import { ApiReferencePage } from "@/components/docs/api-reference-page";
import { getApiDocsPageData } from "@/lib/api-docs";

export const metadata: Metadata = {
  title: "User API Docs",
  description:
    "Endpoints used by /dashboard and API routes designed for user.role=user.",
};

export default async function UserApiDocsPage() {
  const data = await getApiDocsPageData({
    appScope: "dashboard",
    roleScope: "user",
  });

  return (
    <ApiReferencePage
      title="User API Reference"
      description="Reference for platform developers integrating dashboard workflows and user-role API routes."
      usageHeading="Endpoints Used by /dashboard"
      usageDescription="Detected from endpoint literals in src/app/dashboard/** plus indirect Better Auth usage."
      designedHeading='Endpoints Designed for user.role = "user"'
      designedDescription="Extracted from src/app/api/user/** route handlers and their exported HTTP methods."
      siblingHref="/docs/api/admin"
      siblingLabel="Admin API Reference"
      data={data}
    />
  );
}
