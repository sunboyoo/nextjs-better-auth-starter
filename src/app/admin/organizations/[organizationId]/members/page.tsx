import { MembersTable } from "@/components/admin/members-table";

interface MembersPageProps {
    params: Promise<{ organizationId: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
    const { organizationId } = await params;

    return <MembersTable organizationId={organizationId} />;
}
