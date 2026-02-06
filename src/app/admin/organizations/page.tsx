import type { Metadata } from "next";
import { OrganizationsTable } from "../_components/organizations/organizations-table";

export const metadata: Metadata = {
    title: "Organizations | Admin Dashboard",
    description: "Manage organizations in the admin dashboard",
};

export default function OrganizationsPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <OrganizationsTable />
        </div>
    );
}
