import { redirect } from "next/navigation";

interface OrganizationDetailPageProps {
    params: Promise<{ organizationId: string }>;
}

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
    const { organizationId } = await params;

    // Redirect to the profile tab by default
    redirect(`/admin/organizations/${organizationId}/profile`);
}
