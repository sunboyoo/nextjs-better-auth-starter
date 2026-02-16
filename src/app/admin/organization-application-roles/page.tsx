import type { Metadata } from "next";
import { OrganizationApplicationRolesTable } from "../_components/organization-application-roles/organization-application-roles-table";

export const metadata: Metadata = {
    title: "Organization Application Roles | Admin Dashboard",
    description: "Manage organization-scoped business roles",
};

export default function OrganizationApplicationRolesPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <OrganizationApplicationRolesTable />
        </div>
    );
}
