import { OrganizationMemberInvitationsTable } from "@/components/admin/organization-member-invitations-table";

interface InvitationsPageProps {
    params: Promise<{ organizationId: string }>;
}

export default async function InvitationsPage({ params }: InvitationsPageProps) {
    const { organizationId } = await params;

    return <OrganizationMemberInvitationsTable organizationId={organizationId} />;
}
