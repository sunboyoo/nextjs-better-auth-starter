"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    AppWindow,
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    Layers,
    Zap,
    Loader2,
    CheckCircle,
    XCircle,
    Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/select";

interface App {
    id: string;
    key: string;
    name: string;
    description: string | null;
    logo: string | null;
    isActive: boolean;
    createdAt: string;
    resourceCount?: number;
    actionCount?: number;
}

interface AppsResponse {
    apps: App[];
    total: number;
    canWrite: boolean;
}

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
    });

export default function ApplicationsPage() {
    const { organizationId } = useParams<{ organizationId: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();

    // Search & filter state
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Create form state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newLogo, setNewLogo] = useState("");

    // Edit form state
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [editKey, setEditKey] = useState("");
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editLogo, setEditLogo] = useState("");

    // Delete state
    const [deleteApp, setDeleteApp] = useState<{ id: string; name: string } | null>(null);

    // Submitting state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Build API URL
    const buildUrl = useCallback(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");
        return `/api/user/organizations/${organizationId}/apps?${params.toString()}`;
    }, [organizationId, debouncedSearch, statusFilter]);

    const queryKey = userKeys.orgApps(organizationId, `${debouncedSearch}:${statusFilter}`);

    const { data, isLoading, error } = useQuery<AppsResponse>({
        queryKey,
        queryFn: () => fetcher(buildUrl()),
        refetchOnWindowFocus: false,
        staleTime: 2000,
    });

    const mutation = useMutation({
        mutationFn: async ({
            url,
            method,
            body,
        }: {
            url: string;
            method: "POST" | "PUT" | "DELETE";
            body?: unknown;
        }) => {
            const res = await fetch(url, {
                method,
                headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
                body: body !== undefined ? JSON.stringify(body) : undefined,
                credentials: "include",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed to ${method.toLowerCase()}`);
            }
            return res.json();
        },
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await mutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/apps`,
                method: "POST",
                body: {
                    key: newKey,
                    name: newName,
                    description: newDescription || null,
                    logo: newLogo || null,
                },
            });
            setIsCreateOpen(false);
            setNewKey("");
            setNewName("");
            setNewDescription("");
            setNewLogo("");
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Application created successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create app");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId) return;
        setIsSubmitting(true);
        try {
            await mutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/apps/${editId}`,
                method: "PUT",
                body: {
                    name: editName,
                    description: editDescription || null,
                    logo: editLogo || null,
                },
            });
            setIsEditOpen(false);
            setEditId(null);
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Application updated successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update app");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteApp) return;
        try {
            await mutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/apps/${deleteApp.id}`,
                method: "DELETE",
            });
            setDeleteApp(null);
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Application deleted successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete app");
        }
    };

    const handleToggleStatus = async (app: App) => {
        try {
            await mutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/apps/${app.id}`,
                method: "PUT",
                body: { isActive: !app.isActive },
            });
            await queryClient.invalidateQueries({ queryKey });
            toast.success(`Application ${!app.isActive ? "activated" : "deactivated"}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to toggle status");
        }
    };

    const openEdit = (app: App) => {
        setEditId(app.id);
        setEditKey(app.key);
        setEditName(app.name);
        setEditDescription(app.description || "");
        setEditLogo(app.logo || "");
        setIsEditOpen(true);
    };

    const appsList: App[] = data?.apps || [];
    const canWrite = data?.canWrite ?? false;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <AppWindow className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Applications</h2>
                {data && (
                    <Badge variant="secondary" className="text-xs">
                        {data.total}
                    </Badge>
                )}
            </div>

            {/* Filter & Actions */}
            <div className="flex flex-wrap gap-2 items-end justify-between">
                <div className="flex gap-2 items-end">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search applications..."
                            className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-[260px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                    >
                        <SelectTrigger className="w-[140px] flex items-center gap-2">
                            <span className="flex items-center gap-2 text-sm">
                                {statusFilter === "all" ? (
                                    <Box className="w-4 h-4" />
                                ) : statusFilter === "active" ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-destructive" />
                                )}
                                {statusFilter === "all"
                                    ? "All status"
                                    : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {canWrite && (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Create Application
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <AppWindow className="h-5 w-5" />
                                        Create Application
                                    </DialogTitle>
                                    <DialogDescription>
                                        Add a new application to this organization&#39;s RBAC system.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="create-name">Name</Label>
                                            <Input
                                                id="create-name"
                                                placeholder="Order System"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="create-key">Key</Label>
                                            <Input
                                                id="create-key"
                                                placeholder="order_system"
                                                value={newKey}
                                                onChange={(e) => setNewKey(e.target.value)}
                                                required
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Lowercase letters, numbers, underscores only
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-logo">
                                            Logo URL{" "}
                                            <span className="text-muted-foreground text-xs font-normal">
                                                (optional)
                                            </span>
                                        </Label>
                                        <Input
                                            id="create-logo"
                                            placeholder="https://example.com/logo.png"
                                            value={newLogo}
                                            onChange={(e) => setNewLogo(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-desc">
                                            Description{" "}
                                            <span className="text-muted-foreground text-xs font-normal">
                                                (optional)
                                            </span>
                                        </Label>
                                        <Textarea
                                            id="create-desc"
                                            placeholder="Describe the application..."
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
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

            {/* Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table className="text-sm">
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="px-4 py-3 text-xs font-medium">Name</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Key</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Description</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Resources</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Actions</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Status</TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">Created</TableHead>
                            {canWrite && (
                                <TableHead className="px-4 py-3 text-xs font-medium w-[50px]" />
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={canWrite ? 8 : 7} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={canWrite ? 8 : 7} className="h-24 text-center text-destructive">
                                    Failed to load applications
                                </TableCell>
                            </TableRow>
                        ) : appsList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canWrite ? 8 : 7} className="text-center py-12 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                            <AppWindow className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">No applications found</p>
                                            <p className="text-xs mt-1">
                                                {search || statusFilter !== "all"
                                                    ? "Try adjusting your search or filter"
                                                    : canWrite
                                                        ? "Create your first application to get started"
                                                        : "No applications have been created yet"}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            appsList.map((app) => (
                                <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/organizations/${organizationId}/applications/${app.id}`)}>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-border/50">
                                                <Box className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-sm">{app.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                            {app.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                                        {app.description || "—"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/30 text-xs font-medium text-muted-foreground">
                                            <Layers className="h-3.5 w-3.5 opacity-70" />
                                            {app.resourceCount || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/30 text-xs font-medium text-muted-foreground">
                                            <Zap className="h-3.5 w-3.5 opacity-70" />
                                            {app.actionCount || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            {canWrite ? (
                                                <Switch
                                                    checked={app.isActive}
                                                    onCheckedChange={() => handleToggleStatus(app)}
                                                />
                                            ) : null}
                                            <span
                                                className={`text-xs font-medium ${app.isActive
                                                    ? "text-green-600 dark:text-green-500"
                                                    : "text-muted-foreground"
                                                    }`}
                                            >
                                                {app.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(new Date(app.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    {canWrite && (
                                        <TableCell className="px-4 py-3">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEdit(app)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() =>
                                                                setDeleteApp({ id: app.id, name: app.name })
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Footer count */}
                {appsList.length > 0 && (
                    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium">{appsList.length}</span> of{" "}
                            <span className="font-medium">{data?.total || 0}</span>{" "}
                            applications
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5" />
                                Edit Application
                            </DialogTitle>
                            <DialogDescription>Update the application details.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-key">Key</Label>
                                    <Input
                                        id="edit-key"
                                        value={editKey}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Key cannot be changed
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-logo">
                                    Logo URL{" "}
                                    <span className="text-muted-foreground text-xs font-normal">
                                        (optional)
                                    </span>
                                </Label>
                                <Input
                                    id="edit-logo"
                                    placeholder="https://example.com/logo.png"
                                    value={editLogo}
                                    onChange={(e) => setEditLogo(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-desc">
                                    Description{" "}
                                    <span className="text-muted-foreground text-xs font-normal">
                                        (optional)
                                    </span>
                                </Label>
                                <Textarea
                                    id="edit-desc"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
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

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteApp} onOpenChange={() => setDeleteApp(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete application?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{" "}
                            <span className="font-semibold">{deleteApp?.name}</span> and all
                            associated resources, actions, and role assignments. This action
                            cannot be undone.
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
        </div>
    );
}
