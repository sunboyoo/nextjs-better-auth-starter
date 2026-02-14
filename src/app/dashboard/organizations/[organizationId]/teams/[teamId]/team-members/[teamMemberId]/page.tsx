"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { format } from "date-fns";
import {
    ChevronLeft,
    User,
    Mail,
    Calendar,
    Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TeamMemberResponse {
    teamMember: {
        id: string;
        teamId: string;
        userId: string;
        createdAt: string;
        userName: string | null;
        userEmail: string | null;
        userImage: string | null;
    };
    team: { id: string; name: string };
    canWrite: boolean;
}

export default function TeamMemberDetailPage() {
    const { organizationId, teamId, teamMemberId } = useParams<{
        organizationId: string;
        teamId: string;
        teamMemberId: string;
    }>();

    const { data, isLoading, error } = useQuery<TeamMemberResponse>({
        queryKey: userKeys.teamMember(organizationId, teamId, teamMemberId),
        queryFn: () =>
            fetch(
                `/api/user/organizations/${organizationId}/teams/${teamId}/members/${teamMemberId}`,
                { credentials: "include" },
            ).then((res) => {
                if (!res.ok) throw new Error("Failed to fetch team member");
                return res.json();
            }),
        staleTime: 5000,
    });

    const getInitials = (name: string | null | undefined) =>
        name
            ?.split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) ?? "?";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-xl border bg-card p-12 text-center">
                <p className="text-sm text-destructive">
                    Failed to load team member details
                </p>
            </div>
        );
    }

    const { teamMember: tm, team } = data;

    return (
        <div className="space-y-4">
            {/* Back to team members */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                    href={`/dashboard/organizations/${organizationId}/teams/${teamId}/team-members`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Team Members
                </Link>
            </div>

            {/* Member Card */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <Avatar className="h-20 w-20">
                            {tm.userImage && (
                                <AvatarImage
                                    src={tm.userImage}
                                    alt={tm.userName ?? ""}
                                />
                            )}
                            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                                {getInitials(tm.userName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold">
                                {tm.userName ?? "Unknown User"}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                                Team: {team.name}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="border-t divide-y">
                    <div className="flex items-center gap-3 px-6 py-4">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-sm font-medium">
                                {tm.userEmail ?? "—"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">User ID</p>
                            <p className="text-xs font-mono text-muted-foreground">
                                {tm.userId}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Joined Team
                            </p>
                            <p className="text-sm font-medium">
                                {format(
                                    new Date(tm.createdAt),
                                    "MMMM d, yyyy 'at' h:mm a",
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
