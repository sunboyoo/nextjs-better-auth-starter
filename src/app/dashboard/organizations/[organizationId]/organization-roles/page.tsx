"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Shield,
    Crown,
    User,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Lock,
    Search,
    ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { OrganizationPermissionTreeDisplay } from "@/components/shared/organization-permission-tree-display";
import { OrganizationPermissionTreeSelector } from "@/components/shared/organization-permission-tree-selector";
import { statements } from "@/lib/built-in-organization-role-permissions";

const RESOURCE_LABELS: Record<string, string> = {
    organization: "Organization",
    member: "Member",
    invitation: "Invitation",
    team: "Team",
};

const roleIcons: Record<string, React.ElementType> = {
    owner: Crown,
    admin: Shield,
    member: User,
};

const roleColors: Record<string, string> = {
    owner: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    member: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

interface RoleData {
    id: string;
    role: string;
    description?: string;
    permissions: Record<string, string[]>;
    isBuiltIn: boolean;
    createdAt: string | null;
    updatedAt: string | null;
}

interface RolesResponse {
    builtInRoles: RoleData[];
    customRoles: RoleData[];
    canWrite: boolean;
}

// --- Add Role Dialog ---
function AddRoleDialog({
    organizationId,
    onSuccess,
}: {
    organizationId: string;
    onSuccess: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [roleName, setRoleName] = useState("");
    const [permissions, setPermissions] = useState<Record<string, string[]>>({});

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/roles`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ role: roleName.trim(), permission: permissions }),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to create role");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Role created");
            setOpen(false);
            setRoleName("");
            setPermissions({});
            onSuccess();
        },
        onError: (err: Error) => toast.error(err.message),
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Add Custom Role
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Custom Role</DialogTitle>
                    <DialogDescription>
                        Define a new role with specific permissions for this organization.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="role-name">Role Name</Label>
                        <Input
                            id="role-name"
                            placeholder="e.g. editor, viewer, billing..."
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Permissions</Label>
                        <OrganizationPermissionTreeSelector
                            availablePermissions={statements}
                            selectedPermissions={permissions}
                            onChange={setPermissions}
                            resourceLabels={RESOURCE_LABELS}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => mutation.mutate()}
                        disabled={!roleName.trim() || mutation.isPending}
                    >
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Role
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Edit Role Dialog ---
function EditRoleDialog({
    organizationId,
    role,
    onSuccess,
}: {
    organizationId: string;
    role: RoleData;
    onSuccess: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [roleName, setRoleName] = useState(role.role);
    const [permissions, setPermissions] = useState<Record<string, string[]>>(
        role.permissions,
    );

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/roles/${role.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        role: roleName.trim(),
                        permission: permissions,
                    }),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to update role");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Role updated");
            setOpen(false);
            onSuccess();
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const handleOpen = useCallback((nextOpen: boolean) => {
        if (nextOpen) {
            setRoleName(role.role);
            setPermissions(role.permissions);
        }
        setOpen(nextOpen);
    }, [role]);

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Role</DialogTitle>
                    <DialogDescription>
                        Modify the role name and permissions.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-role-name">Role Name</Label>
                        <Input
                            id="edit-role-name"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Permissions</Label>
                        <OrganizationPermissionTreeSelector
                            availablePermissions={statements}
                            selectedPermissions={permissions}
                            onChange={setPermissions}
                            resourceLabels={RESOURCE_LABELS}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => mutation.mutate()}
                        disabled={!roleName.trim() || mutation.isPending}
                    >
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Delete Role Dialog ---
function DeleteRoleDialog({
    organizationId,
    role,
    onSuccess,
}: {
    organizationId: string;
    role: RoleData;
    onSuccess: () => void;
}) {
    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/roles/${role.id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to delete role");
            }
        },
        onSuccess: () => {
            toast.success("Role deleted");
            onSuccess();
        },
        onError: (err: Error) => toast.error(err.message),
    });

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Role</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete the role{" "}
                        <strong>&quot;{role.role}&quot;</strong>? This action
                        cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={mutation.isPending}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {mutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Main Page ---
export default function OrganizationRolesPage() {
    const { organizationId } = useParams<{ organizationId: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();

    const queryKey = ["user", "organizations", organizationId, "roles"];

    const { data, isLoading, error } = useQuery<RolesResponse>({
        queryKey,
        queryFn: () =>
            fetch(`/api/user/organizations/${organizationId}/roles`, {
                credentials: "include",
            }).then((res) => {
                if (!res.ok) throw new Error("Failed to fetch roles");
                return res.json();
            }),
        staleTime: 5000,
    });

    const refetch = () => queryClient.invalidateQueries({ queryKey });

    // Search & sort state for custom roles (must be before early returns)
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("name-asc");
    const [permFilter, setPermFilter] = useState("all");

    const customRoles = data?.customRoles ?? [];

    const filteredCustomRoles = useMemo(() => {
        let result = [...customRoles];

        // Search by role name
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter((r) => r.role.toLowerCase().includes(q));
        }

        // Filter by permission resource
        if (permFilter !== "all") {
            result = result.filter(
                (r) =>
                    r.permissions[permFilter] &&
                    r.permissions[permFilter].length > 0,
            );
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.role.localeCompare(b.role);
                case "name-desc":
                    return b.role.localeCompare(a.role);
                case "newest":
                    return (
                        new Date(b.createdAt ?? 0).getTime() -
                        new Date(a.createdAt ?? 0).getTime()
                    );
                case "oldest":
                    return (
                        new Date(a.createdAt ?? 0).getTime() -
                        new Date(b.createdAt ?? 0).getTime()
                    );
                default:
                    return 0;
            }
        });

        return result;
    }, [customRoles, search, sortBy, permFilter]);

    const isFiltered = search.trim() !== "" || permFilter !== "all";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

    const { builtInRoles, canWrite } = data;

    return (
        <div className="space-y-6">
            {/* Built-in Roles Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Built-in Roles</h3>
                    <Badge variant="secondary" className="text-[10px]">
                        System
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                    These roles are defined by the system and cannot be modified.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {builtInRoles.map((role) => {
                        const Icon = roleIcons[role.role] ?? User;
                        const colorClass =
                            roleColors[role.role] ?? roleColors.member;

                        return (
                            <Card
                                key={role.id}
                                className="cursor-pointer transition-colors hover:bg-muted/50"
                                onClick={() => router.push(`/dashboard/organizations/${organizationId}/organization-roles/${role.id}`)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass} shrink-0`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm capitalize">
                                                {role.role}
                                            </CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                {role.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <OrganizationPermissionTreeDisplay
                                        permissions={role.permissions}
                                    />
                                    <div className="mt-3 pt-3 border-t">
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px]"
                                        >
                                            Built-in
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Custom Roles Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Custom Roles</h3>
                    <Badge variant="outline" className="text-[10px]">
                        {customRoles.length}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                    Custom roles with tailored permissions for this organization.
                </p>

                {/* Search, Filter, Sort & Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-2">
                    <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-end sm:gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search roles..."
                                className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-full sm:w-[220px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:contents">
                            <Select
                                value={permFilter}
                                onValueChange={setPermFilter}
                            >
                                <SelectTrigger className="w-full sm:w-[160px]">
                                    <Shield className="size-4 opacity-60" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All resources</SelectItem>
                                    {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
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
                    {canWrite && (
                        <AddRoleDialog
                            organizationId={organizationId}
                            onSuccess={refetch}
                        />
                    )}
                </div>

                {customRoles.length === 0 && !isFiltered ? (
                    <div className="rounded-xl border bg-card p-8 text-center">
                        <Shield className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                            No custom roles yet
                        </p>
                        {canWrite && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Create a custom role to assign granular
                                permissions.
                            </p>
                        )}
                    </div>
                ) : filteredCustomRoles.length === 0 ? (
                    <div className="rounded-xl border bg-card p-8 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Shield className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">No roles found</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Try adjusting your search or filter
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCustomRoles.map((role) => (
                            <Card
                                key={role.id}
                                className="cursor-pointer transition-colors hover:bg-muted/50"
                                onClick={() => router.push(`/dashboard/organizations/${organizationId}/organization-roles/${role.id}`)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                                                <Shield className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm capitalize">
                                                    {role.role}
                                                </CardTitle>
                                            </div>
                                        </div>
                                        {canWrite && (<div onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-0.5">
                                                <EditRoleDialog
                                                    organizationId={organizationId}
                                                    role={role}
                                                    onSuccess={refetch}
                                                />
                                                <DeleteRoleDialog
                                                    organizationId={organizationId}
                                                    role={role}
                                                    onSuccess={refetch}
                                                />
                                            </div>
                                        </div>)}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <OrganizationPermissionTreeDisplay
                                        permissions={role.permissions}
                                    />
                                    <div className="mt-3 pt-3 border-t">
                                        <Badge
                                            variant="outline"
                                            className="text-[10px]"
                                        >
                                            Custom
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Footer with count */}
                {customRoles.length > 0 && (
                    <div className="text-xs text-muted-foreground text-right">
                        {filteredCustomRoles.length === customRoles.length
                            ? `${customRoles.length} custom role${customRoles.length !== 1 ? "s" : ""}`
                            : `Showing ${filteredCustomRoles.length} of ${customRoles.length} custom roles`}
                    </div>
                )}
            </div>
        </div>
    );
}
