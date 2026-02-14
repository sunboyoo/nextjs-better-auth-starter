import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ organizationId: string; teamId: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
    const { organizationId, teamId } = await params;
    redirect(`/dashboard/organizations/${organizationId}/teams/${teamId}/team-members`);
}
