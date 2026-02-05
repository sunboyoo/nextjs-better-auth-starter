import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { OrganizationInfoCard } from "@/components/admin/organization-info-card";
import { OrganizationDetailTabs } from "@/components/admin/organization-detail-tabs";

export const metadata: Metadata = {
    title: "Organization Details | Admin Dashboard",
    description: "View and manage organization details",
};

interface OrganizationLayoutProps {
    children: React.ReactNode;
    params: Promise<{ organizationId: string }>;
}

export default async function OrganizationLayout({ children, params }: OrganizationLayoutProps) {
    const { organizationId } = await params;

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Back link */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/admin/organizations" className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Back to Organizations
                </Link>
            </div>

            {/* Organization Info Card */}
            <OrganizationInfoCard organizationId={organizationId} />

            {/* Tabs Navigation */}
            <OrganizationDetailTabs organizationId={organizationId} />

            {/* Tab Content */}
            {children}
        </div>
    );
}
