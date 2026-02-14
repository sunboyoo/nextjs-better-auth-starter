"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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

interface OrgMember {
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

    // Fetch org members (for add dialog)
    const { data: orgMembersData, isLoading: orgMembersLoading } = useQuery({
        queryKey: ["org-members-for-team", organizationId],
        queryFn: async () => {
            const { data, error } = await authClient.organization.listMembers({
                query: { organizationId },
            });
            if (error) throw new Error("Failed to load org members");
            const raw = data as unknown;
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray(
                    (raw as Record<string, unknown>)?.members,
                )
                    ? ((raw as Record<string, unknown>).members as unknown[])
                    : [];
            return list as OrgMember[];
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

    const members = data?.members ?? [];
    const canWrite = data?.canWrite ?? false;

    // Filter displayed members
    const filteredMembers = search
        ? members.filter(
            (m) =>
                m.userName?.toLowerCase().includes(search.toLowerCase()) ||
                m.userEmail?.toLowerCase().includes(search.toLowerCase()),
        )
        : members;

    // Filter available org members (exclude already in team)
    const teamUserIds = new Set(members.map((m) => m.userId));
    const availableOrgMembers = (orgMembersData || []).filter(
        (m) => !teamUserIds.has(m.userId),
    );
    const filteredAvailable = addSearch
        ? availableOrgMembers.filter(
            (m) =>
                m.user?.name?.toLowerCase().includes(addSearch.toLowerCase()) ||
                m.user?.email?.toLowerCase().includes(addSearch.toLowerCase()),
        )
        : availableOrgMembers;

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

            {/* Search & Add */}
            <div className="flex flex-wrap gap-2 items-end justify-between">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search members..."
                        className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-[260px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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
                                    {orgMembersLoading ? (
                                        <div className="flex items-center justify-center p-6 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Loading...
                                        </div>
                                    ) : filteredAvailable.length === 0 ? (
                                        <div className="flex flex-col items-center p-6 text-muted-foreground text-sm">
                                            <Users className="h-8 w-8 mb-2 opacity-50" />
                                            {availableOrgMembers.length === 0
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

            {/* Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table className="text-sm">
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="px-4 py-3 text-xs font-medium">
                                Member
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">
                                Email
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">
                                Joined
                            </TableHead>
                            {canWrite && (
                                <TableHead className="px-4 py-3 text-xs font-medium w-[50px]" />
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={canWrite ? 4 : 3}
                                    className="h-24 text-center"
                                >
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell
                                    colSpan={canWrite ? 4 : 3}
                                    className="h-24 text-center text-destructive"
                                >
                                    Failed to load team members
                                </TableCell>
                            </TableRow>
                        ) : filteredMembers.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={canWrite ? 4 : 3}
                                    className="text-center py-12 text-muted-foreground"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                            <Users className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">
                                                No team members
                                            </p>
                                            <p className="text-xs mt-1">
                                                {search
                                                    ? "Try adjusting your search"
                                                    : canWrite
                                                        ? "Add organization members to this team"
                                                        : "No members have been added yet"}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMembers.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell className="px-4 py-3">
                                        <Link
                                            href={`/dashboard/organizations/${organizationId}/teams/${teamId}/team-members/${m.id}`}
                                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                                        >
                                            <Avatar className="h-8 w-8">
                                                {m.userImage && (
                                                    <AvatarImage
                                                        src={m.userImage}
                                                        alt={m.userName ?? ""}
                                                    />
                                                )}
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(m.userName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium text-sm">
                                                {m.userName ?? "Unknown"}
                                            </span>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {m.userEmail ?? "—"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(new Date(m.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    {canWrite && (
                                        <TableCell className="px-4 py-3">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    setRemoveConfirm({
                                                        id: m.id,
                                                        name: m.userName ?? m.userEmail ?? "this member",
                                                    })
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

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
