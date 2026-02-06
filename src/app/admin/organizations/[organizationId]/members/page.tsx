import { MembersTable } from "../../../_components/organizations/members-table";

interface MembersPageProps {
    params: Promise<{ organizationId: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
    const { organizationId } = await params;

    return <MembersTable organizationId={organizationId} />;
}
