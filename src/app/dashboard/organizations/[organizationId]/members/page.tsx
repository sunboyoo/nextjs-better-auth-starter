"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Users, Shield, User, Crown, MoreHorizontal, Trash2, Loader2, LogOut } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    DropdownMenuSeparator,
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Members ({members.length})</h2>
                </div>
                <InviteMemberDialog organizationId={organizationId} onSuccess={fetchMembers} />
            </div>

            {/* Members Table */}
            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="w-[60px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                    No members found
                                </TableCell>
                            </TableRow>
                        ) : (
                            members.map((member) => {
                                const isCurrentUser = member.userId === currentUserId;
                                return (
                                    <TableRow key={member.id} className="cursor-pointer">
                                        <TableCell>
                                            <Link
                                                href={`/dashboard/organizations/${organizationId}/members/${member.id}`}
                                                className="flex items-center gap-3"
                                            >
                                                <Avatar className="h-8 w-8">
                                                    {member.user.image && (
                                                        <AvatarImage src={member.user.image} alt={member.user.name} />
                                                    )}
                                                    <AvatarFallback className="text-xs">
                                                        {member.user.name?.[0]?.toUpperCase() ?? "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {member.user.name}
                                                        {isCurrentUser && (
                                                            <span className="text-xs text-muted-foreground ml-1">(you)</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {member.user.email}
                                                    </p>
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
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
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(member.createdAt), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7">
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
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

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
