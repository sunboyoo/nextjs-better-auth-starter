"use client";
import { Mail, MoreHorizontal, XCircle, Search, Send, UserPlus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import useSWR from "swr";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { OrganizationMemberInvitationSendDialog } from "./organization-member-invitation-send-dialog";

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface Invitation {
    id: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: string;
    createdAt: string;
    inviterId: string;
    inviterName: string | null;
    inviterEmail: string | null;
    inviterImage: string | null;
}

interface OrganizationMemberInvitationsTableProps {
    organizationId: string;
}

const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
    { value: "canceled", label: "Canceled" },
];

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case "pending":
            return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700";
        case "accepted":
            return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700";
        case "rejected":
        case "canceled":
            return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700";
        default:
            return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700";
    }
};

export function OrganizationMemberInvitationsTable({ organizationId }: OrganizationMemberInvitationsTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const urlPage = parseInt(searchParams.get("page") || "1");
    const urlLimit = parseInt(searchParams.get("limit") || "10");

    const [page, setPage] = useState(urlPage);
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
    const [sendDialogMode, setSendDialogMode] = useState<"existing" | "new">("new");
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [resendingId, setResendingId] = useState<string | null>(null);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [invitationToCancel, setInvitationToCancel] = useState<{ id: string; email: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const limit = urlLimit;

    // Ensure URL always has pagination params
    useEffect(() => {
        const currentPage = searchParams.get("page");
        const currentLimit = searchParams.get("limit");

        if (!currentPage || !currentLimit) {
            const newParams = new URLSearchParams(searchParams.toString());
            if (!currentPage) newParams.set("page", "1");
            if (!currentLimit) newParams.set("limit", "10");
            router.replace(`?${newParams.toString()}`, { scroll: false });
        }
    }, [searchParams, router]);

    // Update URL when page changes
    useEffect(() => {
        if (page !== urlPage) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.set("page", page.toString());
            router.replace(`?${newParams.toString()}`, { scroll: false });
        }
    }, [page, urlPage, searchParams, router]);

    const apiUrl = useMemo(() => {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", limit.toString());
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
        return `/api/admin/organizations/${organizationId}/invitations?${params.toString()}`;
    }, [organizationId, page, limit, searchQuery, statusFilter]);

    const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, { revalidateOnFocus: false });

    const openCancelConfirm = (invitationId: string, email: string) => {
        setInvitationToCancel({ id: invitationId, email });
        setCancelConfirmOpen(true);
    };

    const handleCancel = async () => {
        if (!invitationToCancel) return;

        setCancelingId(invitationToCancel.id);
        setCancelConfirmOpen(false);
        try {
            const response = await fetch(
                `/api/admin/organizations/${organizationId}/invitations/${invitationToCancel.id}`,
                { method: "DELETE" }
            );
            if (response.ok) {
                mutate();
            } else {
                const data = await response.json();
                alert(data.error || "Failed to cancel invitation");
            }
        } catch {
            alert("Failed to cancel invitation");
        } finally {
            setCancelingId(null);
            setInvitationToCancel(null);
        }
    };

    const handleResend = async (invitation: Invitation) => {
        setResendingId(invitation.id);
        try {
            const response = await fetch(
                `/api/admin/organizations/${organizationId}/invitations`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: invitation.email,
                        role: invitation.role || "member",
                        resend: true,
                    }),
                }
            );
            if (response.ok) {
                mutate();
            } else {
                const data = await response.json();
                alert(data.error || "Failed to resend invitation");
            }
        } catch {
            alert("Failed to resend invitation");
        } finally {
            setResendingId(null);
        }
    };

    const handleOpenSendDialog = (mode: "existing" | "new") => {
        setSendDialogMode(mode);
        setIsSendDialogOpen(true);
    };

    const columns = [
        { label: "Email" },
        { label: "Role" },
        { label: "Status" },
        { label: "Invited By" },
        { label: "Expires At" },
        { label: "Actions", className: "w-[80px]" },
    ];

    const organization = data?.organization;
    const invitations: Invitation[] = data?.invitations || [];
    const total = data?.total || 0;

    if (error) return <div>Failed to load invitations</div>;

    if (!data || isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-[200px]" />
                    <Skeleton className="h-9 w-[120px]" />
                </div>
                <div className="overflow-hidden rounded-lg border-muted border-2">
                    <Table className="text-sm">
                        <TableHeader className="bg-muted">
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.label} className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 3 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-[180px]" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-6 w-[60px]" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-6 w-[70px]" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Invitations</h2>
                <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="font-medium">{total}</span>
                </Badge>
            </div>

            {/* Search, Filter and Send Invitation Buttons */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search by email..."
                            className="pl-10 pr-4 py-2.5 border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-[180px] h-[42px] rounded-lg">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => handleOpenSendDialog("existing")} variant="outline" size="lg" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Invite Existing User
                    </Button>
                    <Button onClick={() => handleOpenSendDialog("new")} size="lg" className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Invite by Email
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table className="text-sm">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead
                                    key={col.label}
                                    className={[col.className, "px-4 py-3 text-xs font-medium text-muted-foreground"]
                                        .filter(Boolean)
                                        .join(" ")}
                                >
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invitations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    {searchQuery || statusFilter !== "all" ? "No invitations match your filters" : "No invitations found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            invitations.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="px-4 py-3">
                                        <span className="font-medium">{inv.email}</span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge variant="outline" className="capitalize">
                                            {inv.role || "member"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge variant="outline" className={`capitalize ${getStatusBadgeClass(inv.status)}`}>
                                            {inv.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={inv.inviterImage || undefined} alt={inv.inviterName || ""} />
                                                <AvatarFallback className="text-xs">
                                                    {(inv.inviterName || "?").substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm text-muted-foreground">{inv.inviterName || inv.inviterEmail}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(new Date(inv.expiresAt), "MMM d, yyyy HH:mm")}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        {inv.status === "pending" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={cancelingId === inv.id || resendingId === inv.id}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => openCancelConfirm(inv.id, inv.email)}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-2" />
                                                        Cancel Invitation
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleResend(inv)}
                                                        disabled={resendingId === inv.id}
                                                    >
                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                        Resend Invitation
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

                <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{Math.min(limit, invitations.length)}</span> of <span className="font-medium">{total}</span> invitations
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground mr-2">
                            Page <span className="font-medium">{page}</span> of <span className="font-medium">{Math.max(1, Math.ceil(total / limit))}</span>
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-8 w-8 p-0"
                            >
                                <span className="sr-only">Previous page</span>
                                <span aria-hidden="true">‹</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                                disabled={page >= Math.ceil(total / limit) || total === 0}
                                className="h-8 w-8 p-0"
                            >
                                <span className="sr-only">Next page</span>
                                <span aria-hidden="true">›</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <OrganizationMemberInvitationSendDialog
                isOpen={isSendDialogOpen}
                onClose={() => setIsSendDialogOpen(false)}
                onSuccess={() => mutate()}
                organizationId={organizationId}
                mode={sendDialogMode}
            />

            <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel the invitation for &quot;{invitationToCancel?.email}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Cancel Invitation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
