import { OrganizationRoleTable } from "@/components/admin/organization-role-table";

interface RolesPageProps {
    params: Promise<{ organizationId: string }>;
}

export default async function RolesPage({ params }: RolesPageProps) {
    const { organizationId } = await params;

    return <OrganizationRoleTable organizationId={organizationId} />;
}
