"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
    ChevronLeft,
    Mail,
    Calendar,
    Shield,
    Crown,
    User,
    Layers,
    Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface MemberDetailResponse {
    member: {
        id: string;
        role: string;
        createdAt: string;
        userId: string;
        user: {
            id: string;
            name: string;
            email: string;
            image?: string | null;
        } | null;
    };
    teams: {
        teamId: string;
        teamName: string;
        joinedAt: string;
    }[];
    canWrite: boolean;
}

export default function MemberDetailPage() {
    const { organizationId, memberId } = useParams<{
        organizationId: string;
        memberId: string;
    }>();

    const { data, isLoading, error } = useQuery<MemberDetailResponse>({
        queryKey: ["user", "organizations", organizationId, "members", memberId],
        queryFn: () =>
            fetch(
                `/api/user/organizations/${organizationId}/members/${memberId}`,
                { credentials: "include" },
            ).then((res) => {
                if (!res.ok) throw new Error("Failed to fetch member");
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

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "owner":
                return <Crown className="h-3.5 w-3.5" />;
            case "admin":
                return <Shield className="h-3.5 w-3.5" />;
            default:
                return <User className="h-3.5 w-3.5" />;
        }
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case "owner":
                return "default" as const;
            case "admin":
                return "secondary" as const;
            default:
                return "outline" as const;
        }
    };

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
                    Failed to load member details
                </p>
            </div>
        );
    }

    const { member, teams } = data;
    const userName = member.user?.name ?? "Unknown User";
    const userEmail = member.user?.email ?? null;
    const userImage = member.user?.image ?? null;

    return (
        <div className="space-y-4">
            {/* Back */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                    href={`/dashboard/organizations/${organizationId}/members`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Members
                </Link>
            </div>

            {/* Member Card */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <Avatar className="h-20 w-20">
                            {userImage && (
                                <AvatarImage src={userImage} alt={userName} />
                            )}
                            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                                {getInitials(userName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">{userName}</h3>
                            <Badge
                                variant={getRoleBadgeVariant(member.role)}
                                className="gap-1 text-xs capitalize"
                            >
                                {getRoleIcon(member.role)}
                                {member.role}
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
                                {userEmail ?? "—"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">User ID</p>
                            <p className="text-xs font-mono text-muted-foreground">
                                {member.userId}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Joined Organization
                            </p>
                            <p className="text-sm font-medium">
                                {format(
                                    new Date(member.createdAt),
                                    "MMMM d, yyyy 'at' h:mm a",
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Teams */}
            {teams.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-6 py-4 border-b">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            Teams ({teams.length})
                        </h4>
                    </div>
                    <div className="divide-y">
                        {teams.map((t) => (
                            <Link
                                key={t.teamId}
                                href={`/dashboard/organizations/${organizationId}/teams/${t.teamId}/team-members`}
                                className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                        <Layers className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-medium">
                                        {t.teamName}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    Joined{" "}
                                    {format(new Date(t.joinedAt), "MMM d, yyyy")}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
