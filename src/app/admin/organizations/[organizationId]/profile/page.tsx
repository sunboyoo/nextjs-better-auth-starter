import { OrganizationProfileTab } from "../../../_components/organizations/organization-profile-tab";

interface ProfilePageProps {
    params: Promise<{ organizationId: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
    const { organizationId } = await params;

    return <OrganizationProfileTab organizationId={organizationId} />;
}
