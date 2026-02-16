import type { Metadata } from "next";
import { ApplicationsTable } from "../_components/applications/applications-table";

export const metadata: Metadata = {
    title: "Applications | Admin Dashboard",
    description: "Manage applications",
};

export default function ApplicationsPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <ApplicationsTable />
        </div>
    );
}
