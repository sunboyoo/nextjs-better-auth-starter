import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ActionsTable } from "@/components/admin/apps/actions-table";

export const metadata: Metadata = {
    title: "Actions | Admin Dashboard",
    description: "Manage resource actions",
};

interface ActionsPageProps {
    params: Promise<{ appId: string; resourceId: string }>;
}

async function getResource(appId: string, resourceId: string) {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

    // Fetch resources to find the specific one
    const resourcesRes = await fetch(`${protocol}://${host}/api/admin/apps/${appId}/resources`, {
        headers: {
            cookie: headersList.get("cookie") || "",
        },
        cache: "no-store",
    });

    if (!resourcesRes.ok) {
        return null;
    }

    const resourcesData = await resourcesRes.json();
    const resource = resourcesData.resources?.find((r: { id: string }) => r.id === resourceId);

    return resource || null;
}

export default async function ActionsPage({ params }: ActionsPageProps) {
    const { appId, resourceId } = await params;

    const resourceData = await getResource(appId, resourceId);

    if (!resourceData) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link
                    href={`/admin/apps/${appId}/resources`}
                    className="flex items-center gap-1 hover:text-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Resources
                </Link>
            </div>

            <ActionsTable appId={appId} resourceId={resourceId} resourceName={resourceData.name} />
        </div>
    );
}
