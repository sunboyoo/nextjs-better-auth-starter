"use client";
import { Users, Shield, User, MoreHorizontal, Trash2, UserPlus, Search } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface DynamicRole {
    id: string;
    role: string;
    permission?: string | null;
}

import { BUILT_IN_ORGANIZATION_ROLES } from "@/lib/built-in-organization-role-permissions";

const DEFAULT_PERMISSIONS = BUILT_IN_ORGANIZATION_ROLES.reduce((acc, role) => {
    acc[role.role as keyof typeof acc] = role.permissions as Record<string, string[]>;
    return acc;
}, {} as Record<string, Record<string, string[]>>);

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
import { MemberAddDialog } from "./member-add-dialog";
import { Input } from "@/components/ui/input";
import { OrganizationRoleSelect } from "./organization-role-select";
import { OrganizationPermissionTreeDisplay } from "@/components/shared/organization-permission-tree-display";

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface Member {
    id: string;
    role: string;
    createdAt: string;
    userId: string;
    userName: string | null;
    userEmail: string | null;
    userImage: string | null;
}

interface MembersTableProps {
    organizationId: string;
}

export function MembersTable({ organizationId }: MembersTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    // 从 URL 获取分页参数，如果不存在则使用默认值
    const urlPage = parseInt(searchParams.get("page") || "1");
    const urlLimit = parseInt(searchParams.get("limit") || "10");

    const [page, setPage] = useState(urlPage);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const limit = urlLimit;

    // 确保 URL 始终包含分页参数
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

    // 当 page 状态改变时，更新 URL
    useEffect(() => {
        if (page !== urlPage) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.set("page", page.toString());
            router.replace(`?${newParams.toString()}`, { scroll: false });
        }
    }, [page, urlPage, searchParams, router]);

    const membersUrl = `/api/admin/organizations/${organizationId}/members?page=${page}&limit=${limit}`;
    const { data, error, isLoading } = useQuery({
        queryKey: adminKeys.organizationMembers(membersUrl),
        queryFn: () => fetcher(membersUrl),
        refetchOnWindowFocus: false,
    });

    const deleteMemberMutation = useMutation({
        mutationFn: async (memberId: string) =>
            fetch(`/api/admin/organizations/${organizationId}/members/${memberId}`, {
                method: "DELETE",
            }),
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({
            memberId,
            newRole,
        }: {
            memberId: string;
            newRole: string;
        }) =>
            fetch(`/api/admin/organizations/${organizationId}/members/${memberId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            }),
    });

    // 获取组织的动态角色列表
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await fetch(`/api/admin/organizations/${organizationId}/roles`);
                if (response.ok) {
                    const data = await response.json();
                    setDynamicRoles(data.roles || []);
                }
            } catch (err) {
                console.error("Failed to fetch roles:", err);
            }
        };
        fetchRoles();
    }, [organizationId]);

    const openRemoveConfirm = (memberId: string, memberName: string) => {
        setMemberToRemove({ id: memberId, name: memberName });
        setRemoveConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!memberToRemove) return;

        setDeletingId(memberToRemove.id);
        setRemoveConfirmOpen(false);
        try {
            const response = await deleteMemberMutation.mutateAsync(memberToRemove.id);
            if (response.ok) {
                await queryClient.invalidateQueries({
                    queryKey: adminKeys.organizationMembers(membersUrl),
                });
            } else {
                const data = await response.json();
                alert(data.error || "Failed to remove member");
            }
        } catch {
            alert("Failed to remove member");
        } finally {
            setDeletingId(null);
            setMemberToRemove(null);
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: string) => {
        setUpdatingId(memberId);
        try {
            const response = await updateRoleMutation.mutateAsync({ memberId, newRole });
            if (response.ok) {
                await queryClient.invalidateQueries({
                    queryKey: adminKeys.organizationMembers(membersUrl),
                });
            } else {
                const data = await response.json();
                alert(data.error || "Failed to update role");
            }
        } catch {
            alert("Failed to update role");
        } finally {
            setUpdatingId(null);
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "owner":
            case "admin":
                return <Shield className="h-3 w-3" />;
            default:
                return <User className="h-3 w-3" />;
        }
    };

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case "owner":
                return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700";
            case "admin":
                return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700";
            default:
                return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700";
        }
    };

    const columns = [
        { label: "Member" },
        { label: "Organization Role" },
        { label: "Organization Permissions" },
        { label: "Joined At" },
        { label: "Actions", className: "w-[80px]" },
    ];

    // 解构数据（如果存在）
    const organization = data?.organization;
    const members = useMemo(() => data?.members || [], [data?.members]);
    const total = data?.total || 0;
    const handleMemberAddSuccess = () => {
        void queryClient.invalidateQueries({
            queryKey: adminKeys.organizationMembers(membersUrl),
        });
    };

    // 根据搜索条件和角色过滤成员 - 必须在早期返回之前调用以保持 Hooks 顺序
    const filteredMembers = useMemo(() => {
        let result = members;

        // 按角色过滤
        if (roleFilter !== "all") {
            result = result.filter((member: Member) => member.role === roleFilter);
        }

        // 按搜索条件过滤
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter((member: Member) =>
                (member.userName?.toLowerCase() || "").includes(query) ||
                (member.userEmail?.toLowerCase() || "").includes(query)
            );
        }

        return result;
    }, [members, searchQuery, roleFilter]);

    if (error) return <div>Failed to load members</div>;

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
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-4 w-[120px]" />
                                                <Skeleton className="h-3 w-[160px]" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-6 w-[60px]" /></TableCell>
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
                <h2 className="text-xl font-semibold tracking-tight">Members</h2>
                <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1">
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-medium">{total}</span>
                </Badge>
            </div>
            {/* Search, Filter and Add Member */}
            {/* Search, Filter and Add Member */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="pl-10 pr-4 py-2.5 border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        />
                    </div>
                    <OrganizationRoleSelect
                        value={roleFilter}
                        onValueChange={setRoleFilter}
                        dynamicRoles={dynamicRoles}
                        showAllOption={true}
                        allOptionLabel="All roles"
                        placeholder="Filter by role"
                        triggerClassName="w-[200px] h-[42px] rounded-lg"
                    />
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} size="lg" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add member
                </Button>
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
                        {filteredMembers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    {searchQuery ? "No members match your search" : "No members found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMembers.map((member: Member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={member.userImage || undefined} alt={member.userName || ""} />
                                                <AvatarFallback className="text-xs">
                                                    {(member.userName || "?").substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{member.userName || "Unknown"}</span>
                                                <span className="text-xs text-muted-foreground">{member.userEmail || ""}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <OrganizationRoleSelect
                                            value={member.role}
                                            onValueChange={(value) => handleUpdateRole(member.id, value)}
                                            disabled={updatingId === member.id}
                                            dynamicRoles={dynamicRoles}
                                            placeholder="Select role"
                                            triggerClassName="w-[220px] h-9"
                                        />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <OrganizationPermissionTreeDisplay
                                            permissions={(() => {
                                                if (member.role === "owner" || member.role === "admin" || member.role === "member") {
                                                    return DEFAULT_PERMISSIONS[member.role];
                                                }
                                                const dynamicRole = dynamicRoles.find(r => r.role === member.role);
                                                if (!dynamicRole?.permission) return {};
                                                try {
                                                    return JSON.parse(dynamicRole.permission);
                                                } catch {
                                                    return {};
                                                }
                                            })()}
                                        />
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(new Date(member.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={updatingId === member.id || deletingId === member.id}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => openRemoveConfirm(member.id, member.userName || "Unknown")}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Remove from organization
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
                    <div className="text-sm text-muted-foreground">
                        {searchQuery ? (
                            <>Showing <span className="font-medium">{filteredMembers.length}</span> of <span className="font-medium">{total}</span> members (filtered)</>
                        ) : (
                            <>Showing <span className="font-medium">{Math.min(limit, members.length)}</span> of <span className="font-medium">{total}</span> members</>
                        )}
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
            <MemberAddDialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                onSuccess={handleMemberAddSuccess}
                organizationId={organizationId}
            />
            <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove &quot;{memberToRemove?.name}&quot; from the organization? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
