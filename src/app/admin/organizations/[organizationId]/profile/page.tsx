import { OrganizationProfileTab } from "@/components/admin/organization-profile-tab";

interface ProfilePageProps {
    params: Promise<{ organizationId: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
    const { organizationId } = await params;

    return <OrganizationProfileTab organizationId={organizationId} />;
}
