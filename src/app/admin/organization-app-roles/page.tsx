import type { Metadata } from "next";
import { OrganizationAppRolesTable } from "@/components/admin/organization-app-roles/organization-app-roles-table";

export const metadata: Metadata = {
    title: "Organization App Roles | Admin Dashboard",
    description: "Manage organization-scoped business roles",
};

export default function OrganizationAppRolesPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <OrganizationAppRolesTable />
        </div>
    );
}
