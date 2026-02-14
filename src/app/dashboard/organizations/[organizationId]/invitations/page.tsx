"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import {
    Mail,
    MoreHorizontal,
    XCircle,
    Loader2,
    Search,
    ArrowUpDown,
    Clock,
    CheckCircle,
    Ban,
    CircleDot,
} from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

    // Search, filter & sort state
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "email-asc" | "email-desc">("newest");

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

    // Client-side search + filter + sort
    const filteredInvitations = useMemo(() => {
        let result = [...invitations];

        // Search by email
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter((inv) =>
                inv.email.toLowerCase().includes(q),
            );
        }

        // Filter by status
        if (statusFilter !== "all") {
            result = result.filter((inv) => inv.status === statusFilter);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case "newest":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "oldest":
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case "email-asc":
                    return a.email.localeCompare(b.email);
                case "email-desc":
                    return b.email.localeCompare(a.email);
                default:
                    return 0;
            }
        });

        return result;
    }, [invitations, search, statusFilter, sortBy]);

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
            <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Invitations</h2>
                <Badge variant="secondary" className="text-xs">
                    {invitations.length}
                </Badge>
            </div>

            {/* Search, Filter, Sort & Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-2">
                <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-end sm:gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by email..."
                            className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-full sm:w-[260px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:contents">
                        <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                        >
                            <SelectTrigger className="w-full sm:w-[150px]">
                                {statusFilter === "all" ? (
                                    <CircleDot className="size-4 opacity-60" />
                                ) : statusFilter === "pending" ? (
                                    <Clock className="size-4 text-yellow-600" />
                                ) : statusFilter === "accepted" ? (
                                    <CheckCircle className="size-4 text-green-600" />
                                ) : statusFilter === "rejected" ? (
                                    <XCircle className="size-4 text-red-600" />
                                ) : (
                                    <Ban className="size-4 text-muted-foreground" />
                                )}
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="canceled">Canceled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={sortBy}
                            onValueChange={(v) => setSortBy(v as typeof sortBy)}
                        >
                            <SelectTrigger className="w-full sm:w-[160px]">
                                <ArrowUpDown className="size-4 opacity-60" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest first</SelectItem>
                                <SelectItem value="oldest">Oldest first</SelectItem>
                                <SelectItem value="email-asc">Email A–Z</SelectItem>
                                <SelectItem value="email-desc">Email Z–A</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <InviteMemberDialog organizationId={organizationId} onSuccess={fetchInvitations} />
            </div>

            {/* Invitations Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table className="text-sm">
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="px-4 py-3 text-xs font-medium">Email</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Role</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Status</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Sent</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Expires</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium w-[60px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvitations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                            <Mail className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {search || statusFilter !== "all" ? "No invitations found" : "No invitations yet"}
                                            </p>
                                            <p className="text-xs mt-1">
                                                {search || statusFilter !== "all"
                                                    ? "Try adjusting your search or filter"
                                                    : "Send invitations to add members to your organization"}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvitations.map((invitation) => (
                                <TableRow
                                    key={invitation.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/dashboard/organizations/${organizationId}/invitations/${invitation.id}`)}
                                >
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border border-border/50">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-sm">{invitation.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {invitation.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">{getStatusBadge(invitation.status)}</TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(new Date(invitation.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                        {invitation.status === "pending" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
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

                {filteredInvitations.length > 0 && (
                    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium">{filteredInvitations.length}</span>
                            {filteredInvitations.length !== invitations.length && (
                                <>
                                    {" "}of{" "}
                                    <span className="font-medium">{invitations.length}</span>
                                </>
                            )}{" "}
                            invitation{invitations.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                )}
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
