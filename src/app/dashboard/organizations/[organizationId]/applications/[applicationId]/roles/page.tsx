"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
    ArrowUpDown,
    CheckCircle,
    Key,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    UserCog,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PaginationControls } from "@/components/pagination-controls";
import { ApplicationResourceActionTreeDisplay } from "@/components/shared/application-resource-action-tree-display";
import { ApplicationResourceActionTreeSelector } from "@/components/shared/application-resource-action-tree-selector";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUrlPagination } from "@/hooks/use-url-pagination";
import { userKeys } from "@/data/query-keys/user";
import { generateKeyFromName } from "@/lib/utils";

interface ApplicationRole {
    id: string;
    applicationId: string;
    key: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    actionCount: number;
    applicationResourceActions: string[];
}

interface ActionItem {
    id: string;
    key: string;
    name: string;
    resourceId: string;
    resourceKey: string;
    resourceName: string;
}

interface RolesResponse {
    application: {
        id: string;
        key: string;
        name: string;
    };
    roles: ApplicationRole[];
    total: number;
    canWrite: boolean;
}

interface ActionsResponse {
    application: {
        id: string;
        key: string;
        name: string;
    };
    actions: ActionItem[];
    total: number;
    canWrite: boolean;
}

interface MutationInput {
    url: string;
    method: "POST" | "PUT" | "DELETE";
    body?: unknown;
}

const fetcher = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url, { credentials: "include" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            typeof data?.error === "string"
                ? data.error
                : "Failed to fetch";
        throw new Error(message);
    }

    return data as T;
};

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export default function ApplicationRolesPage() {
    const { organizationId, applicationId } = useParams<{
        organizationId: string;
        applicationId: string;
    }>();

    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState<
        "name-asc" | "name-desc" | "newest" | "oldest"
    >("name-asc");

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleKey, setNewRoleKey] = useState("");
    const [isNewRoleKeyManuallyEdited, setIsNewRoleKeyManuallyEdited] =
        useState(false);
    const [newRoleDescription, setNewRoleDescription] = useState("");
    const [newSelectedActionIds, setNewSelectedActionIds] = useState<string[]>(
        [],
    );

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editRoleId, setEditRoleId] = useState<string | null>(null);
    const [editRoleName, setEditRoleName] = useState("");
    const [editRoleKey, setEditRoleKey] = useState("");
    const [editRoleDescription, setEditRoleDescription] = useState("");
    const [editSelectedActionIds, setEditSelectedActionIds] = useState<string[]>(
        [],
    );
    const [isLoadingRoleActions, setIsLoadingRoleActions] = useState(false);

    const [deleteRole, setDeleteRole] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [toggleRoleStatus, setToggleRoleStatus] = useState<{
        id: string;
        name: string;
        newStatus: boolean;
    } | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const rolesQueryKey = userKeys.organizationApplicationRoles(
        organizationId,
        applicationId,
        debouncedSearch,
        statusFilter,
    );

    const { data, isLoading, error } = useQuery<RolesResponse>({
        queryKey: rolesQueryKey,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (statusFilter !== "all") {
                params.set("isActive", statusFilter === "active" ? "true" : "false");
            }

            return fetcher<RolesResponse>(
                `/api/user/organizations/${organizationId}/applications/${applicationId}/roles?${params.toString()}`,
            );
        },
        refetchOnWindowFocus: false,
        staleTime: 2000,
    });

    const { data: actionsData } = useQuery<ActionsResponse>({
        queryKey: userKeys.organizationApplicationActions(
            organizationId,
            applicationId,
        ),
        queryFn: () =>
            fetcher<ActionsResponse>(
                `/api/user/organizations/${organizationId}/applications/${applicationId}/actions`,
            ),
        refetchOnWindowFocus: false,
        staleTime: 10000,
    });

    const requestMutation = useMutation({
        mutationFn: async ({ url, method, body }: MutationInput) => {
            const response = await fetch(url, {
                method,
                credentials: "include",
                headers:
                    body === undefined
                        ? undefined
                        : { "Content-Type": "application/json" },
                body: body === undefined ? undefined : JSON.stringify(body),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (typeof payload?.error === "string") {
                    throw new Error(payload.error);
                }
                if (
                    Array.isArray(payload?.error) &&
                    typeof payload.error[0]?.message === "string"
                ) {
                    throw new Error(payload.error[0].message);
                }
                throw new Error(`Failed to ${method.toLowerCase()}`);
            }

            return payload;
        },
    });

    const canWrite = data?.canWrite ?? false;
    const availableActions = actionsData?.actions ?? [];
    const applicationName =
        data?.application.name ?? actionsData?.application.name ?? "Application";

    const rolesList = useMemo(() => {
        const list = data?.roles ?? [];

        return [...list].sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "newest":
                    return (
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    );
                case "oldest":
                    return (
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime()
                    );
                default:
                    return 0;
            }
        });
    }, [data?.roles, sortBy]);

    const {
        currentPage,
        totalPages,
        limit,
        totalCount,
        paginatedItems: paginatedRoles,
        onPageChange,
        onLimitChange,
    } = useUrlPagination(rolesList, { isDataReady: !isLoading });

    const resetCreateForm = () => {
        setNewRoleName("");
        setNewRoleKey("");
        setIsNewRoleKeyManuallyEdited(false);
        setNewRoleDescription("");
        setNewSelectedActionIds([]);
    };

    const handleNewRoleNameChange = (value: string) => {
        setNewRoleName(value);
        if (!isNewRoleKeyManuallyEdited) {
            setNewRoleKey(generateKeyFromName(value));
        }
    };

    const handleNewRoleKeyChange = (value: string) => {
        const normalized = generateKeyFromName(value);
        setNewRoleKey(normalized);
        setIsNewRoleKeyManuallyEdited(normalized.length > 0);
    };

    const handleCreateRole = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            await requestMutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/applications/${applicationId}/roles`,
                method: "POST",
                body: {
                    key: newRoleKey,
                    name: newRoleName,
                    description: newRoleDescription || null,
                    actionIds: newSelectedActionIds,
                },
            });

            setIsCreateDialogOpen(false);
            resetCreateForm();
            await queryClient.invalidateQueries({ queryKey: rolesQueryKey });
            toast.success("Role created successfully");
        } catch (requestError) {
            toast.error(getErrorMessage(requestError, "Failed to create role"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditDialog = async (role: ApplicationRole) => {
        setEditRoleId(role.id);
        setEditRoleKey(role.key);
        setEditRoleName(role.name);
        setEditRoleDescription(role.description ?? "");
        setEditSelectedActionIds([]);
        setIsEditDialogOpen(true);

        setIsLoadingRoleActions(true);
        try {
            const roleActionsData = await fetcher<{
                actionIds: string[];
            }>(
                `/api/user/organizations/${organizationId}/applications/${applicationId}/roles/${role.id}/actions`,
            );

            setEditSelectedActionIds(roleActionsData.actionIds ?? []);
        } catch {
            toast.error("Failed to load role action assignments");
            setEditSelectedActionIds([]);
        } finally {
            setIsLoadingRoleActions(false);
        }
    };

    const handleEditRole = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editRoleId) return;

        setIsSubmitting(true);

        try {
            await requestMutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/applications/${applicationId}/roles/${editRoleId}`,
                method: "PUT",
                body: {
                    name: editRoleName,
                    description: editRoleDescription || null,
                },
            });

            await requestMutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/applications/${applicationId}/roles/${editRoleId}/actions`,
                method: "PUT",
                body: {
                    actionIds: editSelectedActionIds,
                },
            });

            setIsEditDialogOpen(false);
            setEditRoleId(null);
            setEditRoleName("");
            setEditRoleKey("");
            setEditRoleDescription("");
            setEditSelectedActionIds([]);

            await queryClient.invalidateQueries({ queryKey: rolesQueryKey });
            toast.success("Role updated successfully");
        } catch (requestError) {
            toast.error(getErrorMessage(requestError, "Failed to update role"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRole = async () => {
        if (!deleteRole) return;

        try {
            await requestMutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/applications/${applicationId}/roles/${deleteRole.id}`,
                method: "DELETE",
            });

            setDeleteRole(null);
            await queryClient.invalidateQueries({ queryKey: rolesQueryKey });
            toast.success("Role deleted successfully");
        } catch (requestError) {
            toast.error(getErrorMessage(requestError, "Failed to delete role"));
        }
    };

    const handleToggleRoleStatus = async () => {
        if (!toggleRoleStatus) return;

        try {
            await requestMutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/applications/${applicationId}/roles/${toggleRoleStatus.id}`,
                method: "PUT",
                body: {
                    isActive: toggleRoleStatus.newStatus,
                },
            });

            setToggleRoleStatus(null);
            await queryClient.invalidateQueries({ queryKey: rolesQueryKey });
            toast.success(
                `Role ${toggleRoleStatus.newStatus ? "activated" : "deactivated"}`,
            );
        } catch (requestError) {
            toast.error(getErrorMessage(requestError, "Failed to update status"));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-xl border bg-card p-12 text-center">
                <p className="text-sm text-destructive">Failed to load roles</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Application Roles</h2>
                <Badge variant="secondary" className="text-xs">
                    {data.total}
                </Badge>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-2">
                <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-end sm:gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search roles..."
                            className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-full sm:w-[260px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:contents">
                        <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                        >
                            <SelectTrigger className="w-full sm:w-[140px]">
                                {statusFilter === "all" ? (
                                    <UserCog className="size-4 opacity-60" />
                                ) : statusFilter === "active" ? (
                                    <CheckCircle className="size-4 text-green-600" />
                                ) : (
                                    <XCircle className="size-4 text-destructive" />
                                )}
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={sortBy}
                            onValueChange={(value) =>
                                setSortBy(value as typeof sortBy)
                            }
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

                {canWrite && (
                    <Dialog
                        open={isCreateDialogOpen}
                        onOpenChange={(open) => {
                            setIsCreateDialogOpen(open);
                            if (!open) resetCreateForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button size="sm" className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Create Role
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
                            <form onSubmit={handleCreateRole}>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <UserCog className="h-5 w-5" />
                                        Create Application Role
                                    </DialogTitle>
                                    <DialogDescription>
                                        Assign application resource actions to this role.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-role-name">Role Name</Label>
                                        <Input
                                            id="create-role-name"
                                            placeholder="Order Reviewer"
                                            value={newRoleName}
                                            onChange={(event) =>
                                                handleNewRoleNameChange(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-role-key">Key</Label>
                                        <Input
                                            id="create-role-key"
                                            placeholder="order_reviewer"
                                            value={newRoleKey}
                                            onChange={(event) =>
                                                handleNewRoleKeyChange(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Lowercase letters, numbers,
                                            underscores only
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-role-description">
                                            Description{" "}
                                            <span className="text-muted-foreground text-xs font-normal">
                                                (optional)
                                            </span>
                                        </Label>
                                        <Textarea
                                            id="create-role-description"
                                            value={newRoleDescription}
                                            onChange={(event) =>
                                                setNewRoleDescription(
                                                    event.target.value,
                                                )
                                            }
                                            rows={2}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Assign Actions</Label>
                                        {availableActions.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                No actions available. Create
                                                resources and actions first.
                                            </p>
                                        ) : (
                                            <ApplicationResourceActionTreeSelector
                                                applicationName={applicationName}
                                                actions={availableActions}
                                                selectedActionIds={
                                                    newSelectedActionIds
                                                }
                                                onSelectionChange={
                                                    setNewSelectedActionIds
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsCreateDialogOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Creating...
                                            </>
                                        ) : (
                                            "Create"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {rolesList.length === 0 ? (
                <div className="rounded-xl border bg-card p-10 text-center">
                    <UserCog className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                        No application roles found
                    </p>
                    {canWrite && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Create a role to assign resource actions.
                        </p>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {paginatedRoles.map((role) => (
                            <Card
                                key={role.id}
                                className={`group transition-all ${
                                    canWrite
                                        ? "cursor-pointer hover:shadow-md hover:border-primary/30"
                                        : ""
                                }`}
                                onClick={() => {
                                    if (canWrite) {
                                        void openEditDialog(role);
                                    }
                                }}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-border/50">
                                                <UserCog className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                                    {role.name}
                                                </h3>
                                                <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                                    {role.key}
                                                </code>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Badge
                                                variant={
                                                    role.isActive
                                                        ? "default"
                                                        : "secondary"
                                                }
                                                className="text-[10px] px-1.5 py-0"
                                            >
                                                {role.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                            {canWrite && (
                                                <div
                                                    onClick={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                >
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    void openEditDialog(
                                                                        role,
                                                                    );
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4 mr-2" />
                                                                Update
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() =>
                                                                    setDeleteRole({
                                                                        id: role.id,
                                                                        name: role.name,
                                                                    })
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                    {role.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {role.description}
                                        </p>
                                    )}
                                    <div className="rounded-md border bg-muted/20 p-2">
                                        <ApplicationResourceActionTreeDisplay
                                            applicationName={applicationName}
                                            actionStrings={
                                                role.applicationResourceActions
                                            }
                                            availableActions={availableActions}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Key className="h-3.5 w-3.5 opacity-70" />
                                            {role.actionCount} action
                                            {role.actionCount === 1 ? "" : "s"}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t flex items-center justify-between">
                                        <span className="text-[11px] text-muted-foreground">
                                            Created{" "}
                                            {format(
                                                new Date(role.createdAt),
                                                "MMM d, yyyy",
                                            )}
                                        </span>
                                        {canWrite && (
                                            <div
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                            >
                                                <Switch
                                                    checked={role.isActive}
                                                    onCheckedChange={(checked) =>
                                                        setToggleRoleStatus({
                                                            id: role.id,
                                                            name: role.name,
                                                            newStatus: checked,
                                                        })
                                                    }
                                                    className="scale-75 origin-right"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

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
                </>
            )}

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
                    <form onSubmit={handleEditRole}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5" />
                                Update Role
                            </DialogTitle>
                            <DialogDescription>
                                Update role details and assigned actions.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-role-name">Role Name</Label>
                                <Input
                                    id="edit-role-name"
                                    value={editRoleName}
                                    onChange={(event) =>
                                        setEditRoleName(event.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-role-key">Key</Label>
                                <Input
                                    id="edit-role-key"
                                    value={editRoleKey}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-role-description">
                                    Description{" "}
                                    <span className="text-muted-foreground text-xs font-normal">
                                        (optional)
                                    </span>
                                </Label>
                                <Textarea
                                    id="edit-role-description"
                                    value={editRoleDescription}
                                    onChange={(event) =>
                                        setEditRoleDescription(
                                            event.target.value,
                                        )
                                    }
                                    rows={2}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Assign Actions</Label>
                                {isLoadingRoleActions ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-md border p-3">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading role assignments...
                                    </div>
                                ) : availableActions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No actions available. Create resources
                                        and actions first.
                                    </p>
                                ) : (
                                    <ApplicationResourceActionTreeSelector
                                        applicationName={applicationName}
                                        actions={availableActions}
                                        selectedActionIds={editSelectedActionIds}
                                        onSelectionChange={
                                            setEditSelectedActionIds
                                        }
                                    />
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!deleteRole}
                onOpenChange={() => setDeleteRole(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete role?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{" "}
                            <span className="font-semibold">
                                {deleteRole?.name}
                            </span>{" "}
                            and all action assignments. This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteRole}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={!!toggleRoleStatus}
                onOpenChange={(open) => {
                    if (!open) setToggleRoleStatus(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {toggleRoleStatus?.newStatus
                                ? "Activate role?"
                                : "Deactivate role?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {toggleRoleStatus?.newStatus
                                ? "Activating this role allows it to be used in permission checks."
                                : "Deactivating this role prevents it from being used in permission checks."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleToggleRoleStatus}
                            className={
                                toggleRoleStatus?.newStatus
                                    ? ""
                                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            }
                        >
                            {toggleRoleStatus?.newStatus
                                ? "Activate"
                                : "Deactivate"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
