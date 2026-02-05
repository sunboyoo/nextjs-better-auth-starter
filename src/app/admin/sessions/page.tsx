import type { Metadata } from "next";
import { SessionsTable } from "@/components/admin/sessions-table";

export const metadata: Metadata = {
    title: "Sessions | Admin Dashboard",
    description: "Manage sessions in the admin dashboard",
};

export default function SessionsPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <SessionsTable />
        </div>
    );
}
