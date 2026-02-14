"use client";

import { useState, useMemo } from "react";
import { Send, UserPlus, Loader2, Search, Mail } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrganizationRoleSelect } from "./organization-role-select";
import { SELECTOR_PAGE_LIMIT, ORGANIZATION_INVITATION_EXPIRES_IN_DAYS } from "@/lib/constants";

interface DynamicRole {
    id: string;
    role: string;
}

interface User {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

interface OrganizationMemberInvitationSendDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    organizationId: string;
    mode: "existing" | "new";
}

export function OrganizationMemberInvitationSendDialog({
    isOpen,
    onClose,
    onSuccess,
    organizationId,
    mode,
}: OrganizationMemberInvitationSendDialogProps) {
    // Common state
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");
    const [error, setError] = useState<string | null>(null);

    // Existing user mode state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const rolesUrl = `/api/admin/organizations/${organizationId}/roles`;
    const usersUrl = `/api/admin/users?limit=${SELECTOR_PAGE_LIMIT}`;
    const membersUrl = `/api/admin/organizations/${organizationId}/members?limit=${SELECTOR_PAGE_LIMIT}`;

    const rolesQuery = useQuery({
        queryKey: adminKeys.organizationRoles(rolesUrl),
        queryFn: async () => {
            const response = await fetch(rolesUrl);
            if (!response.ok) throw new Error("Failed to fetch roles");
            const data = await response.json();
            return (data.roles || []) as DynamicRole[];
        },
        enabled: isOpen && !!organizationId,
    });

    const usersQuery = useQuery({
        queryKey: adminKeys.users(usersUrl),
        queryFn: async () => {
            const response = await fetch(usersUrl);
            if (!response.ok) throw new Error("Failed to fetch users");
            const data = await response.json();
            return (data.users || []) as User[];
        },
        enabled: isOpen && !!organizationId && mode === "existing",
    });

    const membersQuery = useQuery({
        queryKey: adminKeys.organizationMembers(membersUrl),
        queryFn: async () => {
            const response = await fetch(membersUrl);
            if (!response.ok) throw new Error("Failed to fetch members");
            const data = await response.json();
            return (data.members || []) as { userId: string }[];
        },
        enabled: isOpen && !!organizationId && mode === "existing",
    });

    const dynamicRoles = rolesQuery.data ?? [];
    const isLoadingRoles = rolesQuery.isLoading;
    const users = usersQuery.data ?? [];
    const existingMemberIds = useMemo(
        () => new Set((membersQuery.data ?? []).map((m) => m.userId)),
        [membersQuery.data],
    );
    const isLoadingUsers = usersQuery.isLoading || membersQuery.isLoading;

    // Filter users for existing mode
    const filteredUsers = useMemo(() => {
        const available = users.filter(u => !existingMemberIds.has(u.id));
        if (!searchQuery.trim()) return available;

        const query = searchQuery.toLowerCase();
        return available.filter(
            u =>
                (u.name?.toLowerCase().includes(query)) ||
                (u.email?.toLowerCase().includes(query))
        );
    }, [users, existingMemberIds, searchQuery]);

    const sendInvitationMutation = useMutation({
        mutationFn: async (payload: { email: string; role: string }) => {
            const response = await fetch(`/api/admin/organizations/${organizationId}/invitations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.[0]?.message || data.error || "Failed to send invitation");
            }
            return data;
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const targetEmail = mode === "existing" ? selectedUser?.email : email;
        if (!targetEmail) {
            setError("Please provide an email address");
            return;
        }

        try {
            await sendInvitationMutation.mutateAsync({ email: targetEmail, role });
            handleClose();
            onSuccess();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        }
    };

    const handleClose = () => {
        setEmail("");
        setRole("member");
        setSearchQuery("");
        setSelectedUser(null);
        setError(null);
        onClose();
    };

    const isExistingMode = mode === "existing";
    const dialogTitle = isExistingMode ? "Invite Existing User" : "Invite by Email";
    const dialogDescription = isExistingMode
        ? "Search for a registered user to invite to this organization."
        : "Send an invitation email to a new or external user.";
    const DialogIcon = isExistingMode ? UserPlus : Send;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DialogIcon className="h-5 w-5" />
                        {dialogTitle}
                    </DialogTitle>
                    <DialogDescription>
                        {dialogDescription}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {isExistingMode ? (
                            <div className="grid gap-2">
                                <Label htmlFor="userSearch">Search & select user</Label>
                                {selectedUser ? (
                                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={selectedUser.image || undefined} />
                                            <AvatarFallback className="text-xs">
                                                {(selectedUser.name || "?").substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{selectedUser.name || "Unknown"}</p>
                                            <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => {
                                                setSelectedUser(null);
                                                setSearchQuery("");
                                            }}
                                        >
                                            Change
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="userSearch"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") e.preventDefault();
                                                }}
                                                placeholder="Search by name or email..."
                                                className="pl-9"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="border rounded-md max-h-[200px] overflow-y-auto">
                                            {isLoadingUsers ? (
                                                <div className="flex items-center justify-center p-4">
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    <span className="text-sm text-muted-foreground">Loading users...</span>
                                                </div>
                                            ) : filteredUsers.length === 0 ? (
                                                <div className="p-4 text-sm text-muted-foreground text-center">
                                                    {searchQuery ? "No users match your search" : "No available users"}
                                                </div>
                                            ) : (
                                                <div className="divide-y">
                                                    {filteredUsers.slice(0, 10).map((user) => (
                                                        <button
                                                            key={user.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setSearchQuery("");
                                                            }}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                                                        >
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={user.image || undefined} />
                                                                <AvatarFallback className="text-xs">
                                                                    {(user.name || "?").substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{user.name || "Unknown"}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                    {filteredUsers.length > 10 && (
                                                        <div className="p-2 text-xs text-center text-muted-foreground">
                                                            Showing 10 of {filteredUsers.length} users. Type to narrow results.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        className="pl-9"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="role">Organization role</Label>
                            <OrganizationRoleSelect
                                value={role}
                                onValueChange={setRole}
                                dynamicRoles={dynamicRoles}
                                disabled={isLoadingRoles}
                                isLoading={isLoadingRoles}
                                placeholder="Select role"
                            />
                        </div>

                        <div className="rounded-lg border bg-muted/50 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Invitation expiry</p>
                                    <p className="text-xs text-muted-foreground">
                                        Links expire after {ORGANIZATION_INVITATION_EXPIRES_IN_DAYS} days
                                    </p>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={sendInvitationMutation.isPending || (isExistingMode ? !selectedUser : !email)}
                        >
                            {sendInvitationMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                "Send Invitation"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
