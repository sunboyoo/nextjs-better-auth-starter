"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    ChevronLeft,
    Shield,
    Crown,
    User,
    Calendar,
    Clock,
    Pencil,
    Trash2,
    Loader2,
    Lock,
    Sparkles,
} from "lucide-react";
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

interface RoleDetailResponse {
    role: {
        id: string;
        role: string;
        description?: string;
        permissions: Record<string, string[]>;
        isBuiltIn: boolean;
        createdAt: string | null;
        updatedAt: string | null;
    };
    canWrite: boolean;
}

export default function OrganizationRoleDetailPage() {
    const { organizationId, organizationRoleId } = useParams<{
        organizationId: string;
        organizationRoleId: string;
    }>();
    const router = useRouter();
    const queryClient = useQueryClient();

    const queryKey = [
        "user",
        "organizations",
        organizationId,
        "roles",
        organizationRoleId,
    ];

    const { data, isLoading, error, refetch } = useQuery<RoleDetailResponse>({
        queryKey,
        queryFn: () =>
            fetch(
                `/api/user/organizations/${organizationId}/roles/${organizationRoleId}`,
                { credentials: "include" },
            ).then((res) => {
                if (!res.ok) throw new Error("Failed to fetch role");
                return res.json();
            }),
        staleTime: 5000,
    });

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
                <p className="text-sm text-destructive">
                    Failed to load role details
                </p>
            </div>
        );
    }

    const { role, canWrite } = data;
    const Icon = roleIcons[role.role] ?? Shield;
    const colorClass = role.isBuiltIn
        ? (roleColors[role.role] ?? roleColors.member)
        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";

    const totalPermissions = Object.values(role.permissions).reduce(
        (acc, actions) => acc + actions.length,
        0,
    );

    return (
        <div className="space-y-4">
            {/* Back */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                    href={`/dashboard/organizations/${organizationId}/organization-roles`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Roles
                </Link>
            </div>

            {/* Role Header Card */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div
                                className={`flex h-14 w-14 items-center justify-center rounded-xl ${colorClass} shrink-0`}
                            >
                                <Icon className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold capitalize">
                                    {role.role}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    {role.isBuiltIn ? (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs gap-1"
                                        >
                                            <Lock className="h-3 w-3" />
                                            Built-in
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="text-xs gap-1"
                                        >
                                            <Sparkles className="h-3 w-3" />
                                            Custom
                                        </Badge>
                                    )}
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        {totalPermissions} permission
                                        {totalPermissions !== 1 ? "s" : ""}
                                    </Badge>
                                </div>
                                {role.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {role.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Actions for custom roles */}
                        {canWrite && !role.isBuiltIn && (
                            <div className="flex items-center gap-2">
                                <EditRoleDialog
                                    organizationId={organizationId}
                                    role={role}
                                    onSuccess={() => {
                                        refetch();
                                        queryClient.invalidateQueries({
                                            queryKey: [
                                                "user",
                                                "organizations",
                                                organizationId,
                                                "roles",
                                            ],
                                        });
                                    }}
                                />
                                <DeleteRoleDialog
                                    organizationId={organizationId}
                                    role={role}
                                    onSuccess={() => {
                                        queryClient.invalidateQueries({
                                            queryKey: [
                                                "user",
                                                "organizations",
                                                organizationId,
                                                "roles",
                                            ],
                                        });
                                        router.push(
                                            `/dashboard/organizations/${organizationId}/organization-roles`,
                                        );
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="border-t divide-y">
                    {role.createdAt && (
                        <div className="flex items-center gap-3 px-6 py-4">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Created
                                </p>
                                <p className="text-sm font-medium">
                                    {format(
                                        new Date(role.createdAt),
                                        "MMMM d, yyyy 'at' h:mm a",
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                    {role.updatedAt && (
                        <div className="flex items-center gap-3 px-6 py-4">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Last Updated
                                </p>
                                <p className="text-sm font-medium">
                                    {format(
                                        new Date(role.updatedAt),
                                        "MMMM d, yyyy 'at' h:mm a",
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 px-6 py-4">
                        <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Role ID
                            </p>
                            <p className="text-xs font-mono text-muted-foreground">
                                {role.id}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permissions Card */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h4 className="text-sm font-semibold">Permissions</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {role.isBuiltIn
                            ? "Built-in permissions managed by the system."
                            : "Custom permissions assigned to this role."}
                    </p>
                </div>
                <div className="p-6">
                    {totalPermissions === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No permissions assigned
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(role.permissions)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([resource, actions]) => (
                                    <div key={resource}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500/60" />
                                            <span className="text-sm font-medium capitalize">
                                                {RESOURCE_LABELS[resource] ??
                                                    resource}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px]"
                                            >
                                                {actions.length}
                                            </Badge>
                                        </div>
                                        <div className="ml-4 flex flex-wrap gap-1.5">
                                            {actions.map((action) => (
                                                <Badge
                                                    key={`${resource}-${action}`}
                                                    variant="outline"
                                                    className="text-[11px] font-mono"
                                                >
                                                    {action}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Edit Role Dialog ---
function EditRoleDialog({
    organizationId,
    role,
    onSuccess,
}: {
    organizationId: string;
    role: RoleDetailResponse["role"];
    onSuccess: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [roleName, setRoleName] = useState(role.role);
    const roleId = role.id;
    const [permissions, setPermissions] = useState<Record<string, string[]>>(
        role.permissions,
    );

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/roles/${roleId}`,
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

    const handleOpen = useCallback(
        (nextOpen: boolean) => {
            if (nextOpen) {
                setRoleName(role.role);
                setPermissions(role.permissions);
            }
            setOpen(nextOpen);
        },
        [role],
    );

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
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
                        {mutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
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
    role: RoleDetailResponse["role"];
    onSuccess: () => void;
}) {
    const roleId = role.id;
    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/roles/${roleId}`,
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
                <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
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
