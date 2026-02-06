import type { Metadata } from "next";
import { UserRolesTable } from "../_components/user-roles/user-roles-table";

export const metadata: Metadata = {
    title: "User Roles | Admin Dashboard",
    description: "Manage user roles in the admin dashboard",
};

export default function UserRolesPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <UserRolesTable />
        </div>
    );
}
