"use client";

import { useState, useMemo } from "react";
import { UserPlus, Loader2, Search } from "lucide-react";
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
import { SELECTOR_PAGE_LIMIT } from "@/lib/constants";

interface DynamicRole {
    id: string;
    role: string; // API 返回的是 role 字段，不是 name
}

interface User {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

interface MemberAddDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    organizationId: string;
}

export function MemberAddDialog({
    isOpen,
    onClose,
    onSuccess,
    organizationId,
}: MemberAddDialogProps) {
    const [userId, setUserId] = useState("");
    const [role, setRole] = useState("member");
    const [error, setError] = useState<string | null>(null);

    // User search state
    const [searchQuery, setSearchQuery] = useState("");

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
        enabled: isOpen && !!organizationId,
    });

    const membersQuery = useQuery({
        queryKey: adminKeys.organizationMembers(membersUrl),
        queryFn: async () => {
            const response = await fetch(membersUrl);
            if (!response.ok) throw new Error("Failed to fetch members");
            const data = await response.json();
            return (data.members || []) as { userId: string }[];
        },
        enabled: isOpen && !!organizationId,
    });

    const dynamicRoles = rolesQuery.data ?? [];
    const isLoadingRoles = rolesQuery.isLoading;
    const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
    const existingMemberIds = useMemo(
        () => new Set((membersQuery.data ?? []).map((m) => m.userId)),
        [membersQuery.data],
    );
    const isLoadingUsers = usersQuery.isLoading || membersQuery.isLoading;

    // Filter users based on search query and exclude existing members
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

    // Get selected user info for display
    const selectedUser = useMemo(() => {
        return users.find(u => u.id === userId);
    }, [users, userId]);

    const addMemberMutation = useMutation({
        mutationFn: async (payload: { userId: string; role: string }) => {
            const response = await fetch(`/api/admin/organizations/${organizationId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to add member");
            }
            return response.json();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await addMemberMutation.mutateAsync({ userId, role });
            setUserId("");
            setRole("member");
            setSearchQuery("");
            onSuccess();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to add member");
        }
    };

    const handleClose = () => {
        setUserId("");
        setRole("member");
        setSearchQuery("");
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Add member
                    </DialogTitle>
                    <DialogDescription>
                        Search for user by name or email to add them to this organization.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="userSearch">Search & select user</Label>
                            {/* Selected user display */}
                            {selectedUser && (
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
                                            setUserId("");
                                            setSearchQuery("");
                                        }}
                                    >
                                        Change
                                    </Button>
                                </div>
                            )}
                            {/* Search input and results */}
                            {!selectedUser && (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="userSearch"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                }
                                            }}
                                            placeholder="Search by name or email..."
                                            className="pl-9"
                                            autoFocus
                                        />
                                    </div>
                                    {/* User list */}
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
                                                            setUserId(user.id);
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
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={addMemberMutation.isPending || !userId}>
                            {addMemberMutation.isPending ? "Adding..." : "Add member"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

