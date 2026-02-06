import type { Metadata } from "next";
import { AssignRolesToMembers } from "../_components/assign-roles-to-members/assign-roles-to-members";

export const metadata: Metadata = {
    title: "Assign Roles to Members | Admin Dashboard",
    description: "Manage role-member assignments",
};

export default function AssignRolesToMembersPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <AssignRolesToMembers />
        </div>
    );
}
