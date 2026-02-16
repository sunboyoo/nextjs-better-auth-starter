import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ResourcesTable } from "../../../_components/applications/resources-table";

export const metadata: Metadata = {
    title: "Resources | Admin Dashboard",
    description: "Manage application resources",
};

interface ResourcesPageProps {
    params: Promise<{ applicationId: string }>;
}

async function getApp(applicationId: string) {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

    const res = await fetch(`${protocol}://${host}/api/admin/applications/${applicationId}`, {
        headers: {
            cookie: headersList.get("cookie") || "",
        },
        cache: "no-store",
    });

    if (!res.ok) {
        return null;
    }

    return res.json();
}

export default async function ResourcesPage({ params }: ResourcesPageProps) {
    const { applicationId } = await params;

    const data = await getApp(applicationId);

    if (!data?.application) {
        notFound();
    }

    const applicationData = data.application;

    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link
                    href="/admin/applications"
                    className="flex items-center gap-1 hover:text-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Applications
                </Link>
            </div>

            <ResourcesTable applicationId={applicationId} />
        </div>
    );
}
