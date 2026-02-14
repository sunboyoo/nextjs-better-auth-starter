"use client";
import { Shield, MoreHorizontal, Trash2, Pencil, Plus, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { OrganizationRoleAddDialog } from "./organization-role-add-dialog";
import { OrganizationRoleEditDialog } from "./organization-role-edit-dialog";
import { OrganizationPermissionTreeDisplay } from "@/components/shared/organization-permission-tree-display";

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

import { BUILT_IN_ORGANIZATION_ROLES } from "@/lib/built-in-organization-role-permissions";


interface OrganizationRole {
    id: string;
    role: string;
    permission: string;
    createdAt: string;
    updatedAt: string | null;
    organizationId: string;
}

interface OrganizationRoleTableProps {
    organizationId: string;
}

export function OrganizationRoleTable({ organizationId }: OrganizationRoleTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);
    const [updatingRole, setUpdatingRole] = useState<{ id: string; role: string; permission: string } | null>(null);
    const limit = 10;

    const rolesUrl = `/api/admin/organizations/${organizationId}/roles?page=${page}&limit=${limit}`;
    const { data, error, isLoading } = useQuery({
        queryKey: adminKeys.organizationRoles(rolesUrl),
        queryFn: () => fetcher(rolesUrl),
        refetchOnWindowFocus: false,
    });

    const deleteRoleMutation = useMutation({
        mutationFn: async (roleId: string) =>
            fetch(`/api/admin/organizations/${organizationId}/roles/${roleId}`, {
                method: "DELETE",
            }),
    });

    // Filter roles based on search
    const filteredBuiltInRoles = useMemo(() => {
        if (!debouncedSearch) return BUILT_IN_ORGANIZATION_ROLES;
        const query = debouncedSearch.toLowerCase();
        return BUILT_IN_ORGANIZATION_ROLES.filter(r => r.role.toLowerCase().includes(query));
    }, [debouncedSearch]);

    const filteredCustomRoles = useMemo(() => {
        const roles = data?.roles || [];
        if (!debouncedSearch) return roles;
        const query = debouncedSearch.toLowerCase();
        return roles.filter((r: OrganizationRole) => r.role.toLowerCase().includes(query));
    }, [data?.roles, debouncedSearch]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        params.set("page", String(page));
        params.set("limit", String(limit));
        router.replace(`?${params.toString()}`);
    }, [debouncedSearch, page, router]);



    const openDeleteConfirm = (roleId: string, roleName: string) => {
        setRoleToDelete({ id: roleId, name: roleName });
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!roleToDelete) return;

        setDeletingId(roleToDelete.id);
        setDeleteConfirmOpen(false);
        try {
            const response = await deleteRoleMutation.mutateAsync(roleToDelete.id);
            if (response.ok) {
                await queryClient.invalidateQueries({
                    queryKey: adminKeys.organizationRoles(rolesUrl),
                });
            } else {
                const data = await response.json();
                alert(data.error || "Failed to delete organization role");
            }
        } catch {
            alert("Failed to delete organization role");
        } finally {
            setDeletingId(null);
            setRoleToDelete(null);
        }
    };

    const parsePermissions = (permissionStr: string): Record<string, string[]> => {
        try {
            return JSON.parse(permissionStr);
        } catch {
            return {};
        }
    };

    const columns = [
        { label: "Organization Role Name" },
        { label: "Members" },
        { label: "Permissions" },
        { label: "Created At" },
        { label: "Actions", className: "w-[80px]" },
    ];

    if (error) return <div>Failed to load roles</div>;

    const handleRoleMutationSuccess = () => {
        void queryClient.invalidateQueries({
            queryKey: adminKeys.organizationRoles(rolesUrl),
        });
    };

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
                                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex gap-1">
                                            <Skeleton className="h-6 w-[60px]" />
                                            <Skeleton className="h-6 w-[60px]" />
                                        </div>
                                    </TableCell>
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

    const { organization, total, activeRoleMembers } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Organization Roles</h2>
                <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="font-medium">{BUILT_IN_ORGANIZATION_ROLES.length + total}</span>
                </Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search roles..."
                        className="pl-10 pr-4 py-2.5 border border-input rounded-lg text-sm bg-background w-[280px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create organization role
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
                        {filteredBuiltInRoles.length === 0 && filteredCustomRoles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No organization roles found
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {/* 内置角色 */}
                                {filteredBuiltInRoles.map((builtInRole) => {
                                    return (
                                        <TableRow key={builtInRole.id} className="bg-muted/30">
                                            <TableCell className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium capitalize">{builtInRole.role}</span>
                                                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                                        Built-in
                                                    </Badge>
                                                    {builtInRole.id === "member" && (
                                                        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="flex flex-col gap-2">
                                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                                        {activeRoleMembers?.[builtInRole.role]?.length || 0} members
                                                    </div>
                                                    {(activeRoleMembers?.[builtInRole.role] || []).map((member: any) => (
                                                        <div key={member.memberId} className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={member.user.image || ""} />
                                                                <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm">{member.user.name}</span>
                                                        </div>
                                                    ))}
                                                    {(!activeRoleMembers?.[builtInRole.role] || activeRoleMembers[builtInRole.role].length === 0) && (
                                                        <span className="text-sm text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <OrganizationPermissionTreeDisplay permissions={builtInRole.permissions as unknown as Record<string, string[]>} />
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                                —
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <span className="text-xs text-muted-foreground">System</span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {/* 动态角色 */}
                                {filteredCustomRoles.map((organizationRole: OrganizationRole) => {
                                    const permissions = parsePermissions(organizationRole.permission);

                                    return (
                                        <TableRow key={organizationRole.id}>
                                            <TableCell className="px-4 py-3">
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity group"
                                                    onClick={() => setUpdatingRole(organizationRole)}
                                                    title="Click to update role"
                                                >
                                                    <span className="font-medium group-hover:text-primary transition-colors">{organizationRole.role}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        Custom
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="flex flex-col gap-2">
                                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                                        {activeRoleMembers?.[organizationRole.role]?.length || 0} members
                                                    </div>
                                                    {(activeRoleMembers?.[organizationRole.role] || []).map((member: any) => (
                                                        <div key={member.memberId} className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={member.user.image || ""} />
                                                                <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm">{member.user.name}</span>
                                                        </div>
                                                    ))}
                                                    {(!activeRoleMembers?.[organizationRole.role] || activeRoleMembers[organizationRole.role].length === 0) && (
                                                        <span className="text-sm text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <OrganizationPermissionTreeDisplay permissions={permissions} />
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                                {format(new Date(organizationRole.createdAt), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={deletingId === organizationRole.id}>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => setUpdatingRole(organizationRole)}
                                                        >
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Update
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => openDeleteConfirm(organizationRole.id, organizationRole.role)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete organization role
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </>
                        )}
                    </TableBody>
                </Table>
                <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
                    <div className="text-sm text-muted-foreground">
                        <span className="font-medium">{BUILT_IN_ORGANIZATION_ROLES.length}</span> built-in <span className="text-muted-foreground/60">•</span> <span className="font-medium">{data?.roles?.length || 0}</span> custom
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
            <OrganizationRoleAddDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onSuccess={handleRoleMutationSuccess}
                organizationId={organizationId}
            />

            <OrganizationRoleEditDialog
                isOpen={!!updatingRole}
                onClose={() => setUpdatingRole(null)}
                onSuccess={handleRoleMutationSuccess}
                organizationId={organizationId}
                role={updatingRole}
            />
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Organization Role</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the organization role &quot;{roleToDelete?.name}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
