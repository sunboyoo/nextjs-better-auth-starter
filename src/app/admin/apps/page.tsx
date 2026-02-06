import type { Metadata } from "next";
import { AppsTable } from "../_components/apps/apps-table";

export const metadata: Metadata = {
    title: "Applications | Admin Dashboard",
    description: "Manage applications",
};

export default function AppsPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <AppsTable />
        </div>
    );
}
