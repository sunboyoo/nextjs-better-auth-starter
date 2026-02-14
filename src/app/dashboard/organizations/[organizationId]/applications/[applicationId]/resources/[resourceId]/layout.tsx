"use client";

import type { ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { ChevronLeft, Layers, Zap, Loader2 } from "lucide-react";

interface ResourceLayoutResponse {
    resource: {
        id: string;
        name: string;
        key: string;
        actionCount: number;
    };
    appName: string;
    canWrite: boolean;
}

export default function ResourceDetailLayout({
    children,
}: {
    children: ReactNode;
}) {
    const params = useParams<{
        organizationId: string;
        applicationId: string;
        resourceId: string;
    }>();
    const { organizationId, applicationId, resourceId } = params;
    const pathname = usePathname();

    const { data, isLoading } = useQuery<ResourceLayoutResponse>({
        queryKey: userKeys.orgAppResource(
            organizationId,
            applicationId,
            resourceId,
        ),
        queryFn: () =>
            fetch(
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${resourceId}`,
                {
                    credentials: "include",
                },
            ).then((res) => {
                if (!res.ok) throw new Error("Failed to fetch resource");
                return res.json();
            }),
        staleTime: 5000,
    });

    const resource = data?.resource;
    const basePath = `/dashboard/organizations/${organizationId}/applications/${applicationId}/resources`;
    const resourcePath = `${basePath}/${resourceId}`;

    const isOverviewActive = pathname === resourcePath;
    const isActionsActive = pathname.includes("/actions");

    return (
        <div className="space-y-4">
            {/* Breadcrumb back to resources list */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                    href={basePath}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Resources
                </Link>
            </div>

            {/* Resource Context Card */}
            <div className="rounded-xl border bg-card p-5">
                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            Loading resource...
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-semibold text-base">
                                {resource?.name ?? "Loading..."}
                            </h2>
                            <div className="flex items-center gap-3 mt-0.5">
                                {resource?.key && (
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                        {resource.key}
                                    </code>
                                )}
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Zap className="h-3.5 w-3.5" />
                                    {resource?.actionCount ?? 0} action
                                    {(resource?.actionCount ?? 0) !== 1
                                        ? "s"
                                        : ""}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sub Navigation */}
            <div className="border-b">
                <nav className="flex gap-1 pb-px -mb-px">
                    <Link
                        href={resourcePath}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            isOverviewActive
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                    >
                        <Layers className="h-4 w-4" />
                        Overview
                    </Link>
                    <Link
                        href={`${resourcePath}/actions`}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            isActionsActive
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                    >
                        <Zap className="h-4 w-4" />
                        Actions
                    </Link>
                </nav>
            </div>

            {/* Tab Content */}
            {children}
        </div>
    );
}
