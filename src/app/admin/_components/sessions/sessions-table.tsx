"use client";

import {
    Search,
    Monitor,
    Smartphone,
    Tablet,
    Clock,
    MapPin,
    Globe,
    LogOut,
    MoreHorizontal,
    User,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
} from "@/components/ui/pagination";

import type { SessionWithUser } from "@/utils/sessions-client";
import { parseUserAgent } from "@/utils/sessions-client";
import { SessionRevokeDialog } from "./session-revoke-dialog";
import { SessionRevokeAllDialog } from "./session-revoke-all-dialog";

// Fetcher function for SWR
const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => res.json());

// Device icon component
function DeviceIcon({ device }: { device: string }) {
    switch (device) {
        case "Mobile":
            return <Smartphone className="h-4 w-4" />;
        case "Tablet":
            return <Tablet className="h-4 w-4" />;
        default:
            return <Monitor className="h-4 w-4" />;
    }
}

// User agent badge component
function UserAgentBadge({ userAgent }: { userAgent: string | null }) {
    const { browser, os, device } = parseUserAgent(userAgent);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <DeviceIcon device={device} />
                        <span className="text-xs">{browser}</span>
                        <span className="text-xs text-muted-foreground/60">on</span>
                        <span className="text-xs">{os}</span>
                    </div>
                </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs break-all">{userAgent || "Unknown"}</p>
            </TooltipContent>
        </Tooltip>
    );
}

export function SessionsTable() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    // State
    const [email, setEmail] = useState(searchParams.get("email") || "");
    const [debouncedEmail, setDebouncedEmail] = useState(email);
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const limit = 10;

    // Selected session for dialogs
    const [selectedSession, setSelectedSession] = useState<SessionWithUser | null>(null);
    const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);

    const [selectedUserForRevokeAll, setSelectedUserForRevokeAll] = useState<{
        user: SessionWithUser["user"];
        sessionCount: number;
    } | null>(null);
    const [isRevokeAllDialogOpen, setIsRevokeAllDialogOpen] = useState(false);

    // Debounce email search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedEmail(email);
        }, 300);
        return () => clearTimeout(timer);
    }, [email]);

    // Update URL when filters/page change - always include page and limit
    useEffect(() => {
        const params = new URLSearchParams();
        if (debouncedEmail) params.set("email", debouncedEmail);
        params.set("page", String(page));
        params.set("limit", String(limit));
        router.replace(`?${params.toString()}`, { scroll: false });
    }, [debouncedEmail, page, limit, router]);

    // Build SWR key
    const swrKey = useMemo(() => {
        const params = new URLSearchParams();
        if (debouncedEmail) params.set("email", debouncedEmail);
        params.set("page", String(page));
        params.set("limit", String(limit));
        return `/api/admin/sessions?${params.toString()}`;
    }, [debouncedEmail, page, limit]);

    const { data, error, isLoading } = useQuery({
        queryKey: adminKeys.sessions(swrKey),
        queryFn: () => fetcher(swrKey),
        refetchOnWindowFocus: false,
        staleTime: 2000,
    });

    // Group sessions by user for the revoke all feature
    const sessionCountByUser = useMemo(() => {
        if (!data?.sessions) return {};
        const counts: Record<string, number> = {};
        for (const session of data.sessions) {
            counts[session.userId] = (counts[session.userId] || 0) + 1;
        }
        return counts;
    }, [data]);

    const handleRevokeSession = (session: SessionWithUser) => {
        setSelectedSession(session);
        setIsRevokeDialogOpen(true);
    };

    const handleRevokeAllUserSessions = (session: SessionWithUser) => {
        setSelectedUserForRevokeAll({
            user: session.user,
            sessionCount: sessionCountByUser[session.userId] || 1,
        });
        setIsRevokeAllDialogOpen(true);
    };

    const handleActionComplete = () => {
        void queryClient.invalidateQueries({
            queryKey: adminKeys.sessions(swrKey),
        });
    };

    // Filter controls
    const filterControls = (
        <div className="flex flex-wrap gap-2 items-end mb-2 w-full">
            <div className="flex gap-2 items-end">
                {/* Search by email */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by email..."
                        className="pl-8 pr-2 py-2 border rounded-md text-sm bg-background w-[250px]"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>
        </div>
    );

    // Table headers configuration
    const tableHeaders = [
        { label: "User" },
        { label: "Device / Browser" },
        { label: "IP Address" },
        { label: "Created" },
        { label: "Expires" },
        { label: "Status" },
        { label: "Actions", className: "w-[80px]" },
    ];

    // Loading skeleton
    if (error) return <div>Failed to load sessions</div>;
    if (!data) {
        return (
            <div className="space-y-4">
                {filterControls}
                <div className="overflow-hidden rounded-lg border-muted border-2">
                    <Table className="text-sm">
                        <TableHeader>
                            <TableRow>
                                {tableHeaders.map((col) => (
                                    <TableHead
                                        key={col.label}
                                        className={[
                                            col.className,
                                            "px-4 py-3 text-xs font-medium text-muted-foreground",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                    >
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-1.5">
                                                <Skeleton className="h-4 w-[120px]" />
                                                <Skeleton className="h-3 w-[160px]" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[140px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[100px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[80px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[80px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-6 w-[60px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    const { sessions, total, totalPages } = data;

    // Check if session is expired
    const isExpired = (expiresAt: string | Date) => {
        return new Date(expiresAt) < new Date();
    };

    // Pagination - always show
    const renderPagination = () => {
        const actualTotalPages = totalPages || 1;
        const pageNumbers = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(actualTotalPages, page + 2);
        if (endPage - startPage < maxPagesToShow - 1) {
            if (startPage === 1) {
                endPage = Math.min(actualTotalPages, startPage + maxPagesToShow - 1);
            } else if (endPage === actualTotalPages) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }
        }
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        return (
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            aria-disabled={page === 1}
                            tabIndex={page === 1 ? -1 : 0}
                            className={page === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>
                    {startPage > 1 && (
                        <>
                            <PaginationItem>
                                <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
                            </PaginationItem>
                            {startPage > 2 && <PaginationEllipsis />}
                        </>
                    )}
                    {pageNumbers.map((pNum) => (
                        <PaginationItem key={pNum}>
                            <PaginationLink
                                isActive={pNum === page}
                                onClick={() => setPage(pNum)}
                            >
                                {pNum}
                            </PaginationLink>
                        </PaginationItem>
                    ))}
                    {endPage < actualTotalPages && (
                        <>
                            {endPage < actualTotalPages - 1 && <PaginationEllipsis />}
                            <PaginationItem>
                                <PaginationLink onClick={() => setPage(actualTotalPages)}>
                                    {actualTotalPages}
                                </PaginationLink>
                            </PaginationItem>
                        </>
                    )}
                    <PaginationItem>
                        <PaginationNext
                            onClick={() => setPage((p) => Math.min(actualTotalPages, p + 1))}
                            aria-disabled={page === actualTotalPages}
                            tabIndex={page === actualTotalPages ? -1 : 0}
                            className={
                                page === actualTotalPages ? "pointer-events-none opacity-50" : ""
                            }
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        );
    };

    return (
        <div className="space-y-4">
            {filterControls}
            <div className="overflow-hidden rounded-lg border-muted border-2">
                <Table className="text-sm">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            {tableHeaders.map((col) => (
                                <TableHead
                                    key={col.label}
                                    className={[
                                        col.className,
                                        "px-4 py-3 text-xs font-medium text-muted-foreground",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                >
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-1.5">
                                                <Skeleton className="h-4 w-[120px]" />
                                                <Skeleton className="h-3 w-[160px]" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[140px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[100px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[80px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[80px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-6 w-[60px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : sessions.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={tableHeaders.length}
                                    className="px-4 py-12 text-center text-muted-foreground"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <User className="h-8 w-8 text-muted-foreground/50" />
                                        <span>No active sessions found</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sessions.map((session: SessionWithUser) => {
                                const expired = isExpired(session.expiresAt);
                                return (
                                    <TableRow key={session.id} className={expired ? "opacity-60" : ""}>
                                        {/* User */}
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage
                                                        src={session.user.image || undefined}
                                                        alt={session.user.name}
                                                    />
                                                    <AvatarFallback className="text-xs">
                                                        {session.user.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {session.user.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {session.user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Device / Browser */}
                                        <TableCell className="px-4 py-3">
                                            <UserAgentBadge userAgent={session.userAgent} />
                                        </TableCell>

                                        {/* IP Address */}
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span>{session.ipAddress || "Unknown"}</span>
                                            </div>
                                        </TableCell>

                                        {/* Created */}
                                        <TableCell className="px-4 py-3">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>
                                                            {formatDistanceToNow(new Date(session.createdAt), {
                                                                addSuffix: true,
                                                            })}
                                                        </span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {format(new Date(session.createdAt), "PPpp")}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>

                                        {/* Expires */}
                                        <TableCell className="px-4 py-3">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
                                                        <Globe className="h-3.5 w-3.5" />
                                                        <span>
                                                            {formatDistanceToNow(new Date(session.expiresAt), {
                                                                addSuffix: true,
                                                            })}
                                                        </span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {format(new Date(session.expiresAt), "PPpp")}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="px-4 py-3">
                                            {expired ? (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                                                >
                                                    Expired
                                                </Badge>
                                            ) : session.impersonatedBy ? (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700"
                                                >
                                                    Impersonated
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700"
                                                >
                                                    Active
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="px-4 py-3">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Actions</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => handleRevokeSession(session)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <LogOut className="mr-2 h-4 w-4" />
                                                        Revoke Session
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleRevokeAllUserSessions(session)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <LogOut className="mr-2 h-4 w-4" />
                                                        Revoke All User Sessions
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-1">
                <div className="text-sm text-muted-foreground">
                    Showing {sessions?.length || 0} of {total || 0} sessions
                </div>
                {renderPagination()}
            </div>

            {/* Revoke single session dialog */}
            {selectedSession && (
                <SessionRevokeDialog
                    session={selectedSession}
                    isOpen={isRevokeDialogOpen}
                    onClose={() => {
                        setIsRevokeDialogOpen(false);
                        setSelectedSession(null);
                    }}
                    onSuccess={handleActionComplete}
                />
            )}

            {/* Revoke all user sessions dialog */}
            {selectedUserForRevokeAll && (
                <SessionRevokeAllDialog
                    user={selectedUserForRevokeAll.user}
                    sessionCount={selectedUserForRevokeAll.sessionCount}
                    isOpen={isRevokeAllDialogOpen}
                    onClose={() => {
                        setIsRevokeAllDialogOpen(false);
                        setSelectedUserForRevokeAll(null);
                    }}
                    onSuccess={handleActionComplete}
                />
            )}
        </div>
    );
}
