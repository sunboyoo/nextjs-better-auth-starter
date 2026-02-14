"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Mail, MoreHorizontal, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InviteMemberDialog } from "../../_components/invite-member-dialog";

interface Invitation {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
    inviterId: string;
}

function getStatusBadge(status: string) {
    switch (status) {
        case "pending":
            return <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">Pending</Badge>;
        case "accepted":
            return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">Accepted</Badge>;
        case "rejected":
            return <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">Rejected</Badge>;
        case "canceled":
            return <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">Canceled</Badge>;
        default:
            return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
}

export default function InvitationsPage() {
    const params = useParams<{ organizationId: string }>();
    const organizationId = params.organizationId;
    const router = useRouter();

    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancelConfirm, setCancelConfirm] = useState<{ id: string; email: string } | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);

    const fetchInvitations = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await authClient.organization.listInvitations({
                query: { organizationId },
            });
            if (error) {
                toast.error("Failed to load invitations");
                return;
            }
            const raw = data as unknown;
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as Record<string, unknown>)?.invitations)
                    ? (raw as Record<string, unknown>).invitations as unknown[]
                    : [];
            setInvitations(list as Invitation[]);
        } catch {
            toast.error("Failed to load invitations");
        } finally {
            setIsLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const handleCancel = async () => {
        if (!cancelConfirm) return;
        setIsCanceling(true);
        try {
            const { error } = await authClient.organization.cancelInvitation({
                invitationId: cancelConfirm.id,
            });
            if (error) {
                toast.error(error.message || "Failed to cancel invitation");
                return;
            }
            toast.success("Invitation canceled");
            setCancelConfirm(null);
            fetchInvitations();
        } catch {
            toast.error("Failed to cancel invitation");
        } finally {
            setIsCanceling(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Invitations ({invitations.length})</h2>
                </div>
                <InviteMemberDialog organizationId={organizationId} onSuccess={fetchInvitations} />
            </div>

            {/* Invitations Table */}
            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="w-[60px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invitations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                                    No invitations found
                                </TableCell>
                            </TableRow>
                        ) : (
                            invitations.map((invitation) => (
                                <TableRow
                                    key={invitation.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/dashboard/organizations/${organizationId}/invitations/${invitation.id}`)}
                                >
                                    <TableCell className="text-sm font-medium">
                                        {invitation.email}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {invitation.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(invitation.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        {invitation.status === "pending" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() =>
                                                            setCancelConfirm({
                                                                id: invitation.id,
                                                                email: invitation.email,
                                                            })
                                                        }
                                                    >
                                                        <XCircle className="mr-2 h-4 w-4" />
                                                        Cancel Invitation
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Cancel Confirmation */}
            <AlertDialog open={!!cancelConfirm} onOpenChange={(v) => !v && setCancelConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel the invitation to <strong>{cancelConfirm?.email}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCanceling}>Keep</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={isCanceling}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isCanceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Cancel Invitation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
