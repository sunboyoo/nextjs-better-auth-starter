"use client";

import type { ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { ChevronLeft, Users, Loader2, Layers } from "lucide-react";

interface TeamResponse {
    team: {
        id: string;
        name: string;
        memberCount: number;
    };
    canWrite: boolean;
}

export default function TeamDetailLayout({ children }: { children: ReactNode }) {
    const params = useParams<{ organizationId: string; teamId: string }>();
    const { organizationId, teamId } = params;
    const pathname = usePathname();

    const { data, isLoading } = useQuery<TeamResponse>({
        queryKey: userKeys.teamDetail(organizationId, teamId),
        queryFn: () =>
            fetch(`/api/user/organizations/${organizationId}/teams/${teamId}`, {
                credentials: "include",
            }).then((res) => {
                if (!res.ok) throw new Error("Failed to fetch team");
                return res.json();
            }),
        staleTime: 5000,
    });

    const teamName = data?.team?.name ?? "Loading...";
    const memberCount = data?.team?.memberCount ?? 0;

    const isTeamMembersActive =
        pathname.includes("/team-members");

    return (
        <div className="space-y-4">
            {/* Breadcrumb back to teams list */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                    href={`/dashboard/organizations/${organizationId}/teams`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Teams
                </Link>
            </div>

            {/* Team Header */}
            <div className="rounded-xl border bg-card p-5">
                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Loading team...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-base">{teamName}</h2>
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                    {memberCount} member{memberCount !== 1 ? "s" : ""}
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
                        href={`/dashboard/organizations/${organizationId}/teams/${teamId}/team-members`}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isTeamMembersActive
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        Team Members
                    </Link>
                </nav>
            </div>

            {/* Tab Content */}
            {children}
        </div>
    );
}
