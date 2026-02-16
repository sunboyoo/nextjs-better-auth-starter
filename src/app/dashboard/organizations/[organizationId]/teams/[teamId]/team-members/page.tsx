"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    Users,
    Plus,
    Trash2,
    Loader2,
    UserPlus,
    Search,
    ArrowUpDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { useUrlPagination } from "@/hooks/use-url-pagination";
import { PaginationControls } from "@/components/pagination-controls";

interface TeamMember {
    id: string;
    teamId: string;
    userId: string;
    createdAt: string;
    userName: string | null;
    userEmail: string | null;
    userImage: string | null;
}

interface TeamMembersResponse {
    team: { id: string; name: string };
    members: TeamMember[];
    total: number;
    canWrite: boolean;
}

interface OrganizationMember {
    id: string;
    userId: string;
    role: string;
    user?: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    };
}

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
    });

export default function TeamMembersPage() {
    const { organizationId, teamId } = useParams<{
        organizationId: string;
        teamId: string;
    }>();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("name-asc");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addSearch, setAddSearch] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [removeConfirm, setRemoveConfirm] = useState<{
        id: string;
        name: string;
    } | null>(null);

    // Fetch team members
    const { data, isLoading, error } = useQuery<TeamMembersResponse>({
        queryKey: userKeys.teamMembers(organizationId, teamId),
        queryFn: () =>
            fetcher(
                `/api/user/organizations/${organizationId}/teams/${teamId}/members`,
            ),
        staleTime: 2000,
    });

    // Fetch organization members (for add dialog)
    const { data: organizationMembersData, isLoading: organizationMembersLoading } = useQuery({
        queryKey: ["organization-members-for-team", organizationId],
        queryFn: async () => {
            const { data, error } = await authClient.organization.listMembers({
                query: { organizationId },
            });
            if (error) throw new Error("Failed to load organization members");
            const raw = data as unknown;
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray(
                    (raw as Record<string, unknown>)?.members,
                )
                    ? ((raw as Record<string, unknown>).members as unknown[])
                    : [];
            return list as OrganizationMember[];
        },
        enabled: isAddOpen,
        staleTime: 5000,
    });

    const mutation = useMutation({
        mutationFn: async ({
            url,
            method,
            body,
        }: {
            url: string;
            method: "POST" | "DELETE";
            body?: unknown;
        }) => {
            const res = await fetch(url, {
                method,
                headers: body ? { "Content-Type": "application/json" } : undefined,
                body: body ? JSON.stringify(body) : undefined,
                credentials: "include",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed to ${method.toLowerCase()}`);
            }
            return res.json();
        },
    });

    const handleAddMember = async (userId: string) => {
        setIsAdding(true);
        try {
            await mutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/teams/${teamId}/members`,
                method: "POST",
                body: { userId },
            });
            await queryClient.invalidateQueries({
                queryKey: userKeys.teamMembers(organizationId, teamId),
            });
            await queryClient.invalidateQueries({
                queryKey: userKeys.teamDetail(organizationId, teamId),
            });
            toast.success("Member added to team");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to add member",
            );
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!removeConfirm) return;
        try {
            await mutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/teams/${teamId}/members/${removeConfirm.id}`,
                method: "DELETE",
            });
            setRemoveConfirm(null);
            await queryClient.invalidateQueries({
                queryKey: userKeys.teamMembers(organizationId, teamId),
            });
            await queryClient.invalidateQueries({
                queryKey: userKeys.teamDetail(organizationId, teamId),
            });
            toast.success("Member removed from team");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to remove member",
            );
        }
    };

    const members = useMemo(() => data?.members ?? [], [data?.members]);
    const canWrite = data?.canWrite ?? false;

    // Search + sort displayed members
    const filteredMembers = useMemo(() => {
        let result = [...members];

        // Filter by search term
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter(
                (m) =>
                    m.userName?.toLowerCase().includes(q) ||
                    m.userEmail?.toLowerCase().includes(q),
            );
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return (a.userName ?? "").localeCompare(b.userName ?? "");
                case "name-desc":
                    return (b.userName ?? "").localeCompare(a.userName ?? "");
                case "newest":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "oldest":
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                default:
                    return 0;
            }
        });

        return result;
    }, [members, search, sortBy]);

    const {
        currentPage,
        totalPages,
        limit,
        totalCount,
        paginatedItems: paginatedTeamMembers,
        onPageChange,
        onLimitChange,
    } = useUrlPagination(filteredMembers, { isDataReady: !isLoading });

    // Filter available organization members (exclude already in team)
    const teamUserIds = new Set(members.map((m) => m.userId));
    const availableOrganizationMembers = (organizationMembersData || []).filter(
        (m) => !teamUserIds.has(m.userId),
    );
    const filteredAvailable = addSearch
        ? availableOrganizationMembers.filter(
            (m) =>
                m.user?.name?.toLowerCase().includes(addSearch.toLowerCase()) ||
                m.user?.email?.toLowerCase().includes(addSearch.toLowerCase()),
        )
        : availableOrganizationMembers;

    const getInitials = (name: string | null | undefined) =>
        name
            ?.split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) ?? "?";

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Team Members</h2>
                {data && (
                    <Badge variant="secondary" className="text-xs">
                        {data.total}
                    </Badge>
                )}
            </div>

            {/* Search, Sort & Add */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-2">
                <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-end sm:gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search members..."
                            className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-full sm:w-[260px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select
                        value={sortBy}
                        onValueChange={(v) => setSortBy(v as typeof sortBy)}
                    >
                        <SelectTrigger className="w-full sm:w-[160px]">
                            <ArrowUpDown className="size-4 opacity-60" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name-asc">Name A–Z</SelectItem>
                            <SelectItem value="name-desc">Name Z–A</SelectItem>
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {canWrite && (
                    <Dialog
                        open={isAddOpen}
                        onOpenChange={(v) => {
                            setIsAddOpen(v);
                            if (!v) setAddSearch("");
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button size="sm" className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Add Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Add Team Member
                                </DialogTitle>
                                <DialogDescription>
                                    Select an organization member to add to this team.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search organization members..."
                                        className="pl-10"
                                        value={addSearch}
                                        onChange={(e) => setAddSearch(e.target.value)}
                                    />
                                </div>
                                <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
                                    {organizationMembersLoading ? (
                                        <div className="flex items-center justify-center p-6 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Loading...
                                        </div>
                                    ) : filteredAvailable.length === 0 ? (
                                        <div className="flex flex-col items-center p-6 text-muted-foreground text-sm">
                                            <Users className="h-8 w-8 mb-2 opacity-50" />
                                            {availableOrganizationMembers.length === 0
                                                ? "All organization members are already in this team"
                                                : "No matching members found"}
                                        </div>
                                    ) : (
                                        filteredAvailable.map((m) => (
                                            <div
                                                key={m.userId}
                                                className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        {m.user?.image && (
                                                            <AvatarImage
                                                                src={m.user.image}
                                                                alt={m.user?.name ?? ""}
                                                            />
                                                        )}
                                                        <AvatarFallback className="text-xs">
                                                            {getInitials(m.user?.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {m.user?.name ?? "Unknown"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {m.user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleAddMember(m.userId)}
                                                    disabled={isAdding}
                                                >
                                                    {isAdding ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Plus className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAddOpen(false)}
                                >
                                    Done
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Members Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Loading team members...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <p className="text-sm text-destructive">Failed to load team members</p>
                </div>
            ) : filteredMembers.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">No team members</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {search
                                    ? "Try adjusting your search"
                                    : canWrite
                                        ? "Add organization members to this team"
                                        : "No members have been added yet"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedTeamMembers.map((m) => (
                        <Card
                            key={m.id}
                            className="group transition-all hover:shadow-md hover:border-primary/30"
                        >
                            <CardContent className="p-4 space-y-3">
                                {/* Top row: avatar + info + remove */}
                                <div className="flex items-start justify-between gap-2">
                                    <Link
                                        href={`/dashboard/organizations/${organizationId}/teams/${teamId}/team-members/${m.id}`}
                                        className="flex items-center gap-3 min-w-0"
                                    >
                                        <Avatar className="h-10 w-10 shrink-0">
                                            {m.userImage && (
                                                <AvatarImage
                                                    src={m.userImage}
                                                    alt={m.userName ?? ""}
                                                />
                                            )}
                                            <AvatarFallback className="text-sm">
                                                {getInitials(m.userName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                                {m.userName ?? "Unknown"}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {m.userEmail ?? "—"}
                                            </p>
                                        </div>
                                    </Link>
                                    {canWrite && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                                setRemoveConfirm({
                                                    id: m.id,
                                                    name: m.userName ?? m.userEmail ?? "this member",
                                                })
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Footer: joined date */}
                                <div className="pt-2 border-t">
                                    <span className="text-[11px] text-muted-foreground">
                                        Joined {format(new Date(m.createdAt), "MMM d, yyyy")}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {filteredMembers.length > 0 && (
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        limit={limit}
                        totalCount={totalCount}
                        onPageChange={onPageChange}
                        onLimitChange={onLimitChange}
                    />
                </div>
            )}

            {/* Remove Confirmation */}
            <AlertDialog
                open={!!removeConfirm}
                onOpenChange={() => setRemoveConfirm(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove{" "}
                            <span className="font-semibold">
                                {removeConfirm?.name}
                            </span>{" "}
                            from this team? They will remain a member of the
                            organization.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
