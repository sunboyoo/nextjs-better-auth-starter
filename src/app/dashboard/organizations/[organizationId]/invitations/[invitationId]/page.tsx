"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    ChevronLeft,
    Mail,
    Calendar,
    Clock,
    Shield,
    User,
    Layers,
    Loader2,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { authClient } from "@/lib/auth-client";

interface InvitationDetailResponse {
    invitation: {
        id: string;
        email: string;
        role: string;
        status: string;
        expiresAt: string;
        createdAt: string;
        inviterId: string;
        teamId: string | null;
        isExpired: boolean;
    };
    inviter: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    } | null;
    team: {
        id: string;
        name: string;
    } | null;
    canWrite: boolean;
}

function getStatusBadge(status: string, isExpired: boolean) {
    if (isExpired) {
        return (
            <Badge
                variant="outline"
                className="text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
            >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expired
            </Badge>
        );
    }
    switch (status) {
        case "pending":
            return (
                <Badge
                    variant="outline"
                    className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                >
                    Pending
                </Badge>
            );
        case "accepted":
            return (
                <Badge
                    variant="outline"
                    className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                >
                    Accepted
                </Badge>
            );
        case "rejected":
            return (
                <Badge
                    variant="outline"
                    className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                >
                    Rejected
                </Badge>
            );
        case "canceled":
            return (
                <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
                >
                    Canceled
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="text-xs">
                    {status}
                </Badge>
            );
    }
}

export default function InvitationDetailPage() {
    const { organizationId, invitationId } = useParams<{
        organizationId: string;
        invitationId: string;
    }>();
    const router = useRouter();

    const { data, isLoading, error, refetch } =
        useQuery<InvitationDetailResponse>({
            queryKey: [
                "user",
                "organizations",
                organizationId,
                "invitations",
                invitationId,
            ],
            queryFn: () =>
                fetch(
                    `/api/user/organizations/${organizationId}/invitations/${invitationId}`,
                    { credentials: "include" },
                ).then((res) => {
                    if (!res.ok) throw new Error("Failed to fetch invitation");
                    return res.json();
                }),
            staleTime: 5000,
        });

    const cancelMutation = useMutation({
        mutationFn: async () => {
            const { error } = await authClient.organization.cancelInvitation({
                invitationId,
            });
            if (error) throw new Error(error.message || "Failed to cancel");
        },
        onSuccess: () => {
            toast.success("Invitation canceled");
            refetch();
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

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
                    Failed to load invitation details
                </p>
            </div>
        );
    }

    const { invitation, inviter, team, canWrite } = data;

    return (
        <div className="space-y-4">
            {/* Back */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                    href={`/dashboard/organizations/${organizationId}/invitations`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Invitations
                </Link>
            </div>

            {/* Invitation Card */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        {invitation.email}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        {getStatusBadge(
                                            invitation.status,
                                            invitation.isExpired,
                                        )}
                                        <Badge
                                            variant="outline"
                                            className="text-xs capitalize"
                                        >
                                            <Shield className="h-3 w-3 mr-1" />
                                            {invitation.role}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cancel action */}
                        {canWrite &&
                            invitation.status === "pending" &&
                            !invitation.isExpired && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="gap-1.5"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Cancel Invitation
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Cancel Invitation
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to cancel the
                                                invitation to{" "}
                                                <strong>{invitation.email}</strong>?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel
                                                disabled={cancelMutation.isPending}
                                            >
                                                Keep
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() =>
                                                    cancelMutation.mutate()
                                                }
                                                disabled={cancelMutation.isPending}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                {cancelMutation.isPending && (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                )}
                                                Cancel Invitation
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                    </div>
                </div>

                <div className="border-t divide-y">
                    <div className="flex items-center gap-3 px-6 py-4">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Sent
                            </p>
                            <p className="text-sm font-medium">
                                {format(
                                    new Date(invitation.createdAt),
                                    "MMMM d, yyyy 'at' h:mm a",
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Expires
                            </p>
                            <p
                                className={`text-sm font-medium ${invitation.isExpired ? "text-destructive" : ""}`}
                            >
                                {format(
                                    new Date(invitation.expiresAt),
                                    "MMMM d, yyyy 'at' h:mm a",
                                )}
                                {invitation.isExpired && " (expired)"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Invited By
                            </p>
                            {inviter ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <Avatar className="h-6 w-6">
                                        {inviter.image && (
                                            <AvatarImage
                                                src={inviter.image}
                                                alt={inviter.name}
                                            />
                                        )}
                                        <AvatarFallback className="text-[10px]">
                                            {inviter.name?.[0]?.toUpperCase() ??
                                                "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {inviter.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {inviter.email}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Unknown
                                </p>
                            )}
                        </div>
                    </div>
                    {team && (
                        <div className="flex items-center gap-3 px-6 py-4">
                            <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Team
                                </p>
                                <Link
                                    href={`/dashboard/organizations/${organizationId}/teams/${team.id}/team-members`}
                                    className="text-sm font-medium text-primary hover:underline"
                                >
                                    {team.name}
                                </Link>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 px-6 py-4">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Invitation ID
                            </p>
                            <p className="text-xs font-mono text-muted-foreground">
                                {invitation.id}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
