"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Users, Shield, User, Crown, MoreHorizontal, Trash2, Loader2, LogOut, Search, ArrowUpDown, CircleDot } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface Member {
    id: string;
    role: string;
    createdAt: Date;
    userId: string;
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    };
}

export default function MembersPage() {
    const params = useParams<{ organizationId: string }>();
    const organizationId = params.organizationId;

    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string } | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Search, filter & sort state
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("name-asc");

    const fetchMembers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await authClient.organization.listMembers({
                query: { organizationId },
            });
            if (error) {
                toast.error("Failed to load members");
                return;
            }
            // data can be an array directly or an object like { members: [...] }
            const raw = data as unknown;
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as Record<string, unknown>)?.members)
                    ? (raw as Record<string, unknown>).members as unknown[]
                    : [];
            setMembers(list as Member[]);
        } catch {
            toast.error("Failed to load members");
        } finally {
            setIsLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    useEffect(() => {
        authClient.getSession().then(({ data }) => {
            if (data?.user) {
                setCurrentUserId(data.user.id);
            }
        });
    }, []);

    // Client-side search + filter + sort
    const filteredMembers = useMemo(() => {
        let result = [...members];

        // Search by name or email
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter(
                (m) =>
                    m.user.name?.toLowerCase().includes(q) ||
                    m.user.email?.toLowerCase().includes(q),
            );
        }

        // Filter by role
        if (roleFilter !== "all") {
            result = result.filter((m) => m.role === roleFilter);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return (a.user.name ?? "").localeCompare(b.user.name ?? "");
                case "name-desc":
                    return (b.user.name ?? "").localeCompare(a.user.name ?? "");
                case "newest":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "oldest":
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                default:
                    return 0;
            }
        });

        return result;
    }, [members, search, roleFilter, sortBy]);

    const handleRemoveMember = async () => {
        if (!removeConfirm) return;
        setIsRemoving(true);
        try {
            const { error } = await authClient.organization.removeMember({
                memberIdOrEmail: removeConfirm.id,
                organizationId,
            });
            if (error) {
                toast.error(error.message || "Failed to remove member");
                return;
            }
            toast.success("Member removed successfully");
            setRemoveConfirm(null);
            fetchMembers();
        } catch {
            toast.error("Failed to remove member");
        } finally {
            setIsRemoving(false);
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: string) => {
        try {
            const { error } = await authClient.organization.updateMemberRole({
                memberId,
                role: newRole,
                organizationId,
            });
            if (error) {
                toast.error(error.message || "Failed to update role");
                return;
            }
            toast.success("Role updated successfully");
            fetchMembers();
        } catch {
            toast.error("Failed to update role");
        }
    };

    const handleLeave = async () => {
        try {
            const { error } = await authClient.organization.leave({
                organizationId,
            });
            if (error) {
                toast.error(error.message || "Failed to leave organization");
                return;
            }
            toast.success("You have left the organization");
            window.location.href = "/dashboard/organizations";
        } catch {
            toast.error("Failed to leave organization");
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "owner":
                return <Crown className="h-3 w-3" />;
            case "admin":
                return <Shield className="h-3 w-3" />;
            default:
                return <User className="h-3 w-3" />;
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

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Members</h2>
                <Badge variant="secondary" className="text-xs">
                    {members.length}
                </Badge>
            </div>

            {/* Search, Filter, Sort & Actions */}
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
                    <div className="grid grid-cols-2 gap-2 sm:contents">
                        <Select
                            value={roleFilter}
                            onValueChange={setRoleFilter}
                        >
                            <SelectTrigger className="w-full sm:w-[140px]">
                                {roleFilter === "all" ? (
                                    <CircleDot className="size-4 opacity-60" />
                                ) : roleFilter === "owner" ? (
                                    <Crown className="size-4 text-amber-600" />
                                ) : roleFilter === "admin" ? (
                                    <Shield className="size-4 text-blue-600" />
                                ) : (
                                    <User className="size-4 text-muted-foreground" />
                                )}
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All roles</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
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
                                <SelectItem value="name-asc">Name A–Z</SelectItem>
                                <SelectItem value="name-desc">Name Z–A</SelectItem>
                                <SelectItem value="newest">Newest first</SelectItem>
                                <SelectItem value="oldest">Oldest first</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <InviteMemberDialog organizationId={organizationId} onSuccess={fetchMembers} />
            </div>

            {/* Members Grid */}
            {filteredMembers.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">
                                {search || roleFilter !== "all" ? "No members found" : "No members yet"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {search || roleFilter !== "all"
                                    ? "Try adjusting your search or filter"
                                    : "Invite members to your organization"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredMembers.map((member) => {
                        const isCurrentUser = member.userId === currentUserId;
                        const roleColor =
                            member.role === "owner"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : member.role === "admin"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-muted text-muted-foreground";
                        return (
                            <Card
                                key={member.id}
                                className="group transition-all hover:shadow-md hover:border-primary/30"
                            >
                                <CardContent className="p-4 space-y-3">
                                    {/* Top row: avatar + info + actions */}
                                    <div className="flex items-start justify-between gap-2">
                                        <Link
                                            href={`/dashboard/organizations/${organizationId}/members/${member.id}`}
                                            className="flex items-center gap-3 min-w-0"
                                        >
                                            <Avatar className="h-10 w-10 shrink-0">
                                                {member.user.image && (
                                                    <AvatarImage src={member.user.image} alt={member.user.name} />
                                                )}
                                                <AvatarFallback className="text-sm">
                                                    {member.user.name?.[0]?.toUpperCase() ?? "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                                    {member.user.name}
                                                    {isCurrentUser && (
                                                        <span className="text-xs text-muted-foreground font-normal ml-1">(you)</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {member.user.email}
                                                </p>
                                            </div>
                                        </Link>
                                        <div className="shrink-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {isCurrentUser ? (
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={handleLeave}
                                                        >
                                                            <LogOut className="mr-2 h-4 w-4" />
                                                            Leave Organization
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        member.role !== "owner" && (
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() =>
                                                                    setRemoveConfirm({
                                                                        id: member.id,
                                                                        name: member.user.name || member.user.email,
                                                                    })
                                                                }
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Remove Member
                                                            </DropdownMenuItem>
                                                        )
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Role & date row */}
                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <div>
                                            {member.role === "owner" ? (
                                                <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1 text-xs">
                                                    {getRoleIcon(member.role)}
                                                    {member.role}
                                                </Badge>
                                            ) : (
                                                <Select
                                                    value={member.role}
                                                    onValueChange={(val) => handleUpdateRole(member.id, val)}
                                                >
                                                    <SelectTrigger className="h-7 w-[110px] text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="member">Member</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-muted-foreground">
                                            Joined {format(new Date(member.createdAt), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Footer with count */}
            {members.length > 0 && (
                <div className="text-xs text-muted-foreground text-right">
                    {filteredMembers.length === members.length
                        ? `${members.length} member${members.length !== 1 ? "s" : ""}`
                        : `Showing ${filteredMembers.length} of ${members.length} members`}
                </div>
            )}

            {/* Remove Confirmation */}
            <AlertDialog open={!!removeConfirm} onOpenChange={(v) => !v && setRemoveConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{removeConfirm?.name}</strong> from this organization? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            disabled={isRemoving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
