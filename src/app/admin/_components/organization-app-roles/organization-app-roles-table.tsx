"use client";
import {
    Search,
    Plus,
    Trash2,
    MoreHorizontal,
    Pencil,
    UserCog,
    Filter,
    CheckCircle,
    XCircle,
    Zap,
    Key,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { OrgAppSelector } from "./org-app-selector";
import { AppResourceActionTreeSelector } from "@/components/shared/app-resource-action-tree-selector";
import { AppResourceActionTreeDisplay } from "@/components/shared/app-resource-action-tree-display";

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface Organization {
    id: string;
    name: string;
    slug: string;
}

interface App {
    id: string;
    key: string;
    name: string;
    isActive: boolean;
}

interface OrganizationAppRole {
    id: string;
    organizationId: string;
    appId: string;
    key: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    organizationName: string | null;
    appName: string | null;
    appKey: string | null;
    actionCount: number;
    appResourceActions: string[];
}

interface Action {
    id: string;
    key: string;
    name: string;
    resourceId: string;
    resourceKey: string;
    resourceName: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
type MutationInput = {
    url: string;
    method: "POST" | "PUT" | "DELETE";
    body?: unknown;
};

export function OrganizationAppRolesTable() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const urlPage = parseInt(searchParams.get("page") || String(DEFAULT_PAGE));
    const urlLimit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT));

    const [selectedOrgId, setSelectedOrgId] = useState(searchParams.get("organizationId") || "");
    const [selectedAppId, setSelectedAppId] = useState(searchParams.get("appId") || "");
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [statusFilter, setStatusFilter] = useState(searchParams.get("isActive") || "all");
    const [page, setPage] = useState(urlPage);
    const [limit] = useState(urlLimit);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Create form state
    const [newRoleKey, setNewRoleKey] = useState("");
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleDescription, setNewRoleDescription] = useState("");
    const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);

    // Edit form state
    const [editRoleId, setEditRoleId] = useState<string | null>(null);
    const [editRoleKey, setEditRoleKey] = useState("");
    const [editRoleName, setEditRoleName] = useState("");
    const [editRoleDescription, setEditRoleDescription] = useState("");
    const [editSelectedActionIds, setEditSelectedActionIds] = useState<string[]>([]);

    // Toggle status state
    const [toggleStatusRole, setToggleStatusRole] = useState<{ id: string; name: string; newStatus: boolean } | null>(null);

    // Fetch available actions for the selected app
    const actionsUrl = selectedAppId
        ? `/api/admin/apps/${selectedAppId}/actions?limit=200`
        : null;
    const { data: actionsData } = useQuery({
        queryKey: adminKeys.appActions(actionsUrl),
        queryFn: () => fetcher(actionsUrl!),
        enabled: Boolean(actionsUrl),
    });
    const availableActions: Action[] = actionsData?.actions || [];

    // Fetch selected app details for name
    const appUrl = selectedAppId ? `/api/admin/apps/${selectedAppId}` : null;
    const { data: appData } = useQuery({
        queryKey: adminKeys.app(appUrl),
        queryFn: () => fetcher(appUrl!),
        enabled: Boolean(appUrl),
    });
    const appName = appData?.app?.name || "App";

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedOrgId) params.set("organizationId", selectedOrgId);
        if (selectedAppId) params.set("appId", selectedAppId);
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");
        params.set("page", String(page));
        params.set("limit", String(limit));
        router.replace(`${pathname}?${params.toString()}`);
    }, [selectedOrgId, selectedAppId, debouncedSearch, page, router, pathname, limit, statusFilter]);

    // Build SWR key for roles
    const buildSwrKey = useCallback(() => {
        if (!selectedOrgId || !selectedAppId) return null;
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");
        params.set("page", String(page));
        params.set("limit", String(limit));
        return `/api/admin/organizations/${selectedOrgId}/apps/${selectedAppId}/organization-app-roles?${params.toString()}`;
    }, [selectedOrgId, selectedAppId, debouncedSearch, statusFilter, page, limit]);

    const rolesUrl = buildSwrKey();
    const { data, error, isLoading } = useQuery({
        queryKey: adminKeys.appRoles(rolesUrl),
        queryFn: () => fetcher(rolesUrl!),
        enabled: Boolean(rolesUrl),
        refetchOnWindowFocus: false,
        staleTime: 2000,
    });

    const requestMutation = useMutation({
        mutationFn: async ({ url, method, body }: MutationInput) =>
            fetch(url, {
                method,
                headers: body === undefined ? undefined : { "Content-Type": "application/json" },
                body: body === undefined ? undefined : JSON.stringify(body),
            }),
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrgId || !selectedAppId) {
            alert("Please select organization and app first");
            return;
        }
        setIsSubmitting(true);

        try {
            const response = await requestMutation.mutateAsync({
                url: `/api/admin/organizations/${selectedOrgId}/apps/${selectedAppId}/organization-app-roles`,
                method: "POST",
                body: {
                    key: newRoleKey,
                    name: newRoleName,
                    description: newRoleDescription || null,
                    actionIds: selectedActionIds,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to create role");
                return;
            }

            setIsAddDialogOpen(false);
            setNewRoleKey("");
            setNewRoleName("");
            setNewRoleDescription("");
            setSelectedActionIds([]);
            await queryClient.invalidateQueries({
                queryKey: adminKeys.appRoles(rolesUrl),
            });
        } catch (error) {
            console.error("Error creating role:", error);
            alert("Failed to create role");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editRoleId) return;
        setIsSubmitting(true);

        try {
            // Update role details
            const response = await requestMutation.mutateAsync({
                url: `/api/admin/organizations/${selectedOrgId}/apps/${selectedAppId}/organization-app-roles/${editRoleId}`,
                method: "PUT",
                body: {
                    name: editRoleName,
                    description: editRoleDescription || null,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to update role");
                return;
            }

            // Update role actions
            await requestMutation.mutateAsync({
                url: `/api/admin/organizations/${selectedOrgId}/apps/${selectedAppId}/organization-app-roles/${editRoleId}/actions`,
                method: "PUT",
                body: {
                    actionIds: editSelectedActionIds,
                },
            });

            setIsEditDialogOpen(false);
            setEditRoleId(null);
            setEditRoleKey("");
            setEditRoleName("");
            setEditRoleDescription("");
            setEditSelectedActionIds([]);
            await queryClient.invalidateQueries({
                queryKey: adminKeys.appRoles(rolesUrl),
            });
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Failed to update role");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteRoleId) return;

        try {
            const response = await requestMutation.mutateAsync({
                url: `/api/admin/organizations/${selectedOrgId}/apps/${selectedAppId}/organization-app-roles/${deleteRoleId}`,
                method: "DELETE",
            });

            if (!response.ok) {
                alert("Failed to delete role");
                return;
            }

            setDeleteRoleId(null);
            await queryClient.invalidateQueries({
                queryKey: adminKeys.appRoles(rolesUrl),
            });
        } catch (error) {
            console.error("Error deleting role:", error);
            alert("Failed to delete role");
        }
    };

    const handleToggleStatus = async () => {
        if (!toggleStatusRole) return;

        try {
            const response = await requestMutation.mutateAsync({
                url: `/api/admin/organizations/${selectedOrgId}/apps/${selectedAppId}/organization-app-roles/${toggleStatusRole.id}`,
                method: "PUT",
                body: { isActive: toggleStatusRole.newStatus },
            });

            if (!response.ok) {
                alert("Failed to update status");
                return;
            }

            setToggleStatusRole(null);
            await queryClient.invalidateQueries({
                queryKey: adminKeys.appRoles(rolesUrl),
            });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const openEditDialog = async (role: OrganizationAppRole) => {
        setEditRoleId(role.id);
        setEditRoleKey(role.key);
        setEditRoleName(role.name);
        setEditRoleDescription(role.description || "");

        // Fetch current actions for this role
        try {
            const res = await fetch(`/api/admin/organizations/${selectedOrgId}/apps/${selectedAppId}/organization-app-roles/${role.id}/actions`);
            const data = await res.json();
            setEditSelectedActionIds(data.actionIds || []);
        } catch {
            setEditSelectedActionIds([]);
        }

        setIsEditDialogOpen(true);
    };

    const roles: OrganizationAppRole[] = data?.roles || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    if (error) return <div>Failed to load roles</div>;

    const renderPagination = () => (
        <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
            <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{roles.length}</span> of <span className="font-medium">{total}</span> roles
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">
                    Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="h-8 w-8 p-0"
                    >
                        <span className="sr-only">Previous page</span>
                        <span aria-hidden="true">‹</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="h-8 w-8 p-0"
                    >
                        <span className="sr-only">Next page</span>
                        <span aria-hidden="true">›</span>
                    </Button>
                </div>
            </div>
        </div>
    );

    const selectorRow = (
        <OrgAppSelector
            selectedOrgId={selectedOrgId}
            onOrgChange={(id) => {
                setSelectedOrgId(id);
                setPage(1);
            }}
            selectedAppId={selectedAppId}
            onAppChange={(id) => {
                setSelectedAppId(id);
                setPage(1);
            }}
        />
    );

    const hasValidSelection = selectedOrgId && selectedAppId && selectedOrgId !== "all" && selectedAppId !== "all";

    const filterControls = (
        <div className="flex flex-wrap gap-3 items-end">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search roles..."
                    className="pl-10 w-[400px]"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px] flex items-center gap-2">
                    <span className="flex items-center gap-2">
                        {statusFilter === "all" ? (
                            <Filter className="w-4 h-4" />
                        ) : statusFilter === "active" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        {statusFilter === "all" ? "All status" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    </span>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex-1" />
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="flex items-center gap-2" disabled={!hasValidSelection}>
                        <Plus className="h-4 w-4" />
                        Create organization app role
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UserCog className="h-5 w-5" />
                                Create organization app role
                            </DialogTitle>
                            <DialogDescription>
                                Create business role for this organization and app.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Role Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Order Reviewer"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="key">Key</Label>
                                    <Input
                                        id="key"
                                        placeholder="order_reviewer"
                                        value={newRoleKey}
                                        onChange={(e) => setNewRoleKey(e.target.value)}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Lowercase with underscores</p>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Textarea
                                    id="description"
                                    placeholder="Can review and approve orders"
                                    value={newRoleDescription}
                                    onChange={(e) => setNewRoleDescription(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Assign Actions</Label>
                                {availableActions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No actions available for this app.</p>
                                ) : (
                                    <AppResourceActionTreeSelector
                                        appName={appName}
                                        actions={availableActions}
                                        selectedActionIds={selectedActionIds}
                                        onSelectionChange={setSelectedActionIds}
                                    />
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );

    const noSelectionPlaceholder = (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <UserCog className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select organization and app to view roles.</p>
            </div>
        </div>
    );

    const columns = [
        { label: "Name" },
        { label: "Key" },
        { label: "Description" },


        { label: "App Resources and Actions" },
        { label: "Status" },
        { label: "Created" },
        { label: "", className: "w-[50px]" },
    ];

    if (!hasValidSelection) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">Organization App Roles</h2>
                </div>
                {selectorRow}
                {noSelectionPlaceholder}
            </div>
        );
    }

    if (!data || isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">Organization App Roles</h2>
                </div>
                {selectorRow}
                {filterControls}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <Table className="text-sm">
                        <TableHeader className="bg-muted">
                            <TableRow>
                                {columns.map((col, i) => (
                                    <TableHead key={i}>{col.label}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Organization App Roles</h2>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/50 text-xs font-medium text-muted-foreground">
                    <UserCog className="h-3.5 w-3.5" />
                    <span>{total}</span>
                </div>
            </div>

            {selectorRow}
            {filterControls}

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table className="text-sm">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            {columns.map((col, i) => (
                                <TableHead
                                    key={i}
                                    className={[col.className, "px-4 py-3 text-xs font-medium text-muted-foreground"].filter(Boolean).join(" ")}
                                >
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No roles found. Click &apos;Create Role&apos; to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell className="px-4 py-3">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1 -m-1 rounded transition-colors group"
                                            onClick={() => openEditDialog(role)}
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                                                <UserCog className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className="font-medium group-hover:text-primary transition-colors">{role.name}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border font-mono text-muted-foreground">
                                            {role.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                                        {role.description || "-"}
                                    </TableCell>


                                    <TableCell className="px-4 py-3">
                                        <AppResourceActionTreeDisplay
                                            appName={role.appName || appName}
                                            actionStrings={role.appResourceActions}
                                            availableActions={availableActions}
                                        />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={role.isActive}
                                                onCheckedChange={(checked) => {
                                                    setToggleStatusRole({
                                                        id: role.id,
                                                        name: role.name,
                                                        newStatus: checked,
                                                    });
                                                }}
                                            />
                                            <span className={`text-xs font-medium ${role.isActive ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}`}>
                                                {role.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(new Date(role.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(role)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Update
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => setDeleteRoleId(role.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {renderPagination()}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteRoleId} onOpenChange={() => setDeleteRoleId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete role?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the role and all its action assignments. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <form onSubmit={handleEdit}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5" />
                                Update role
                            </DialogTitle>
                            <DialogDescription>Update role details and action assignments.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Role Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={editRoleName}
                                        onChange={(e) => setEditRoleName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-key">Key</Label>
                                    <Input
                                        id="edit-key"
                                        value={editRoleKey}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">Key cannot be changed</p>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Textarea
                                    id="edit-description"
                                    value={editRoleDescription}
                                    onChange={(e) => setEditRoleDescription(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Assign Actions</Label>
                                {availableActions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No actions available for this app.</p>
                                ) : (
                                    <AppResourceActionTreeSelector
                                        appName={appName}
                                        actions={availableActions}
                                        selectedActionIds={editSelectedActionIds}
                                        onSelectionChange={setEditSelectedActionIds}
                                    />
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Toggle Status Confirmation Dialog */}
            <AlertDialog open={!!toggleStatusRole} onOpenChange={(open) => !open && setToggleStatusRole(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {toggleStatusRole?.newStatus ? "Activate" : "Deactivate"} Role?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to {toggleStatusRole?.newStatus ? "activate" : "deactivate"}{" "}
                            <strong>{toggleStatusRole?.name}</strong>?
                            {!toggleStatusRole?.newStatus && (
                                <span className="block mt-2 text-destructive">
                                    Deactivating this role will prevent it from being used for permission checks.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleToggleStatus}
                            className={toggleStatusRole?.newStatus ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                        >
                            {toggleStatusRole?.newStatus ? "Activate" : "Deactivate"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
