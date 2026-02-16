"use client";

import type { ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import {
    ChevronLeft,
    AppWindow,
    Layers,
    Zap,
    Loader2,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ApplicationLayoutResponse {
    application: {
        id: string;
        name: string;
        key: string;
        isActive: boolean;
        resourceCount: number;
        actionCount: number;
    };
    canWrite: boolean;
}

export default function ApplicationDetailLayout({
    children,
}: {
    children: ReactNode;
}) {
    const params = useParams<{
        organizationId: string;
        applicationId: string;
    }>();
    const { organizationId, applicationId } = params;
    const pathname = usePathname();

    const { data, isLoading } = useQuery<ApplicationLayoutResponse>({
        queryKey: userKeys.organizationApplication(organizationId, applicationId),
        queryFn: () =>
            fetch(
                `/api/user/organizations/${organizationId}/applications/${applicationId}`,
                {
                    credentials: "include",
                },
            ).then((res) => {
                if (!res.ok) throw new Error("Failed to fetch application");
                return res.json();
            }),
        staleTime: 5000,
    });

    const application = data?.application;
    const basePath = `/dashboard/organizations/${organizationId}/applications/${applicationId}`;

    const isOverviewActive = pathname === basePath;
    const isResourcesActive = pathname.includes("/resources");

    return (
        <div className="space-y-4">
            {/* Breadcrumb back to applications list */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                    href={`/dashboard/organizations/${organizationId}/applications`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Applications
                </Link>
            </div>

            {/* Application Context Card */}
            <div className="rounded-xl border bg-card p-5">
                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            Loading application...
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <AppWindow className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold text-base">
                                    {application?.name ?? "Loading..."}
                                </h2>
                                {application && (
                                    <Badge
                                        variant={
                                            application.isActive
                                                ? "default"
                                                : "secondary"
                                        }
                                        className="text-[10px]"
                                    >
                                        {application.isActive ? (
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                        ) : (
                                            <XCircle className="h-3 w-3 mr-1" />
                                        )}
                                        {application.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                                {application?.key && (
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                        {application.key}
                                    </code>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Layers className="h-3.5 w-3.5" />
                                        {application?.resourceCount ?? 0} resource
                                        {(application?.resourceCount ?? 0) !== 1
                                            ? "s"
                                            : ""}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Zap className="h-3.5 w-3.5" />
                                        {application?.actionCount ?? 0} action
                                        {(application?.actionCount ?? 0) !== 1
                                            ? "s"
                                            : ""}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sub Navigation */}
            <div className="border-b">
                <nav className="flex gap-1 pb-px -mb-px">
                    <Link
                        href={basePath}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            isOverviewActive
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                    >
                        <AppWindow className="h-4 w-4" />
                        Overview
                    </Link>
                    <Link
                        href={`${basePath}/resources`}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            isResourcesActive
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                    >
                        <Layers className="h-4 w-4" />
                        Resources
                    </Link>
                </nav>
            </div>

            {/* Tab Content */}
            {children}
        </div>
    );
}
