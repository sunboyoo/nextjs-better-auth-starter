"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
    ArrowUpDown,
    ImageIcon,
    ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { generateKeyFromName } from "@/lib/utils";

interface Application {
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
    applications: Application[];
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

    // Search, filter & sort state
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("name-asc");

    // Create form state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newName, setNewName] = useState("");
    const [isNewKeyManuallyEdited, setIsNewKeyManuallyEdited] = useState(false);
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
    const [deleteApp, setDeleteApplication] = useState<{ id: string; name: string } | null>(null);

    // Submitting state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Logo preview state (create)
    const [newLogoPreviewStatus, setNewLogoPreviewStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
    const [debouncedNewLogo, setDebouncedNewLogo] = useState("");

    // Logo preview state (edit)
    const [editLogoPreviewStatus, setEditLogoPreviewStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
    const [debouncedEditLogo, setDebouncedEditLogo] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Debounce create logo preview
    useEffect(() => {
        if (!newLogo.trim()) {
            setDebouncedNewLogo("");
            setNewLogoPreviewStatus("idle");
            return;
        }
        setNewLogoPreviewStatus("loading");
        const timer = setTimeout(() => setDebouncedNewLogo(newLogo.trim()), 500);
        return () => clearTimeout(timer);
    }, [newLogo]);

    // Debounce edit logo preview
    useEffect(() => {
        if (!editLogo.trim()) {
            setDebouncedEditLogo("");
            setEditLogoPreviewStatus("idle");
            return;
        }
        setEditLogoPreviewStatus("loading");
        const timer = setTimeout(() => setDebouncedEditLogo(editLogo.trim()), 500);
        return () => clearTimeout(timer);
    }, [editLogo]);

    // Build API URL
    const buildUrl = useCallback(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");
        return `/api/user/organizations/${organizationId}/applications?${params.toString()}`;
    }, [organizationId, debouncedSearch, statusFilter]);

    const queryKey = userKeys.organizationApplications(organizationId, `${debouncedSearch}:${statusFilter}`);

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

    const handleNewNameChange = (value: string) => {
        setNewName(value);
        if (!isNewKeyManuallyEdited) {
            setNewKey(generateKeyFromName(value));
        }
    };

    const handleNewKeyChange = (value: string) => {
        const normalized = generateKeyFromName(value);
        setNewKey(normalized);
        setIsNewKeyManuallyEdited(normalized.length > 0);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await mutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/applications`,
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
            setIsNewKeyManuallyEdited(false);
            setNewDescription("");
            setNewLogo("");
            setNewLogoPreviewStatus("idle");
            setDebouncedNewLogo("");
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Application created successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create application");
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
                url: `/api/user/organizations/${organizationId}/applications/${editId}`,
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
            toast.error(err instanceof Error ? err.message : "Failed to update application");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteApp) return;
        try {
            await mutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/applications/${deleteApp.id}`,
                method: "DELETE",
            });
            setDeleteApplication(null);
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Application deleted successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete application");
        }
    };

    const handleToggleStatus = async (application: Application) => {
        try {
            await mutation.mutateAsync({
                url: `/api/user/organizations/${organizationId}/applications/${application.id}`,
                method: "PUT",
                body: { isActive: !application.isActive },
            });
            await queryClient.invalidateQueries({ queryKey });
            toast.success(`Application ${!application.isActive ? "activated" : "deactivated"}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to toggle status");
        }
    };

    const openEdit = (application: Application) => {
        setEditId(application.id);
        setEditKey(application.key);
        setEditName(application.name);
        setEditDescription(application.description || "");
        setEditLogo(application.logo || "");
        setEditLogoPreviewStatus("idle");
        setDebouncedEditLogo("");
        setIsEditOpen(true);
    };

    const canWrite = data?.canWrite ?? false;

    const applicationsList = useMemo(() => {
        const list: Application[] = data?.applications || [];
        return [...list].sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "newest":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "oldest":
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                default:
                    return 0;
            }
        });
    }, [data?.applications, sortBy]);

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
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-2">
                <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-end sm:gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search applications..."
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
                                    <Box className="size-4 opacity-60" />
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
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-name">Name</Label>
                                        <Input
                                            id="create-name"
                                            placeholder="Order System"
                                            value={newName}
                                            onChange={(e) => handleNewNameChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-key">Key</Label>
                                        <Input
                                            id="create-key"
                                            placeholder="order_system"
                                            value={newKey}
                                            onChange={(e) => handleNewKeyChange(e.target.value)}
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Lowercase letters, numbers, underscores only
                                        </p>
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
                                        {newLogo.trim() && (
                                            <div className="flex items-center gap-3 rounded-md border p-3">
                                                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                                                    {newLogoPreviewStatus === "loading" && (
                                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    )}
                                                    {newLogoPreviewStatus === "error" && (
                                                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    {debouncedNewLogo && newLogoPreviewStatus !== "error" && (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={debouncedNewLogo}
                                                            alt="Logo preview"
                                                            className="h-full w-full object-cover"
                                                            onLoad={() => setNewLogoPreviewStatus("loaded")}
                                                            onError={() => setNewLogoPreviewStatus("error")}
                                                        />
                                                    )}
                                                    {newLogoPreviewStatus === "idle" && (
                                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    {newLogoPreviewStatus === "loading" && (
                                                        <p className="text-xs text-muted-foreground">Loading preview...</p>
                                                    )}
                                                    {newLogoPreviewStatus === "loaded" && (
                                                        <p className="text-xs text-muted-foreground">Logo preview loaded</p>
                                                    )}
                                                    {newLogoPreviewStatus === "error" && (
                                                        <p className="text-xs text-destructive">Unable to load image. Please check the URL.</p>
                                                    )}
                                                    {newLogoPreviewStatus === "idle" && (
                                                        <p className="text-xs text-muted-foreground">Enter a URL to preview</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
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

            {/* Applications Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Loading applications...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <p className="text-sm text-destructive">Failed to load applications</p>
                </div>
            ) : applicationsList.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <AppWindow className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">No applications found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {search || statusFilter !== "all"
                                    ? "Try adjusting your search or filter"
                                    : canWrite
                                        ? "Create your first application to get started"
                                        : "No applications have been created yet"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {applicationsList.map((application) => (
                            <Card
                                key={application.id}
                                className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                                onClick={() => router.push(`/dashboard/organizations/${organizationId}/applications/${application.id}`)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-border/50">
                                                <Box className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                                    {application.name}
                                                </h3>
                                                <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                                    {application.key}
                                                </code>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Badge
                                                variant={application.isActive ? "default" : "secondary"}
                                                className="text-[10px] px-1.5 py-0"
                                            >
                                                {application.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                            {canWrite && (
                                                <div onClick={(e) => e.stopPropagation()}>
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
                                                            <DropdownMenuItem onClick={() => openEdit(application)}>
                                                                <Pencil className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleStatus(application); }}>
                                                                {application.isActive ? (
                                                                    <XCircle className="h-4 w-4 mr-2" />
                                                                ) : (
                                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                                )}
                                                                {application.isActive ? "Deactivate" : "Activate"}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() =>
                                                                    setDeleteApplication({ id: application.id, name: application.name })
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
                                    {application.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {application.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Layers className="h-3.5 w-3.5 opacity-70" />
                                            {application.resourceCount || 0} resource{(application.resourceCount || 0) !== 1 ? "s" : ""}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Zap className="h-3.5 w-3.5 opacity-70" />
                                            {application.actionCount || 0} action{(application.actionCount || 0) !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t flex items-center justify-between">
                                        <span className="text-[11px] text-muted-foreground">
                                            Created {format(new Date(application.createdAt), "MMM d, yyyy")}
                                        </span>
                                        {canWrite && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Switch
                                                    checked={application.isActive}
                                                    onCheckedChange={() => handleToggleStatus(application)}
                                                    className="scale-75 origin-right"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Footer count */}
                    <div className="text-xs text-muted-foreground text-right">
                        {applicationsList.length === (data?.total || 0)
                            ? `${applicationsList.length} application${applicationsList.length !== 1 ? "s" : ""}`
                            : `Showing ${applicationsList.length} of ${data?.total || 0} applications`}
                    </div>
                </>
            )}

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
                                {editLogo.trim() && (
                                    <div className="flex items-center gap-3 rounded-md border p-3">
                                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                                            {editLogoPreviewStatus === "loading" && (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            )}
                                            {editLogoPreviewStatus === "error" && (
                                                <ImageOff className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            {debouncedEditLogo && editLogoPreviewStatus !== "error" && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={debouncedEditLogo}
                                                    alt="Logo preview"
                                                    className="h-full w-full object-cover"
                                                    onLoad={() => setEditLogoPreviewStatus("loaded")}
                                                    onError={() => setEditLogoPreviewStatus("error")}
                                                />
                                            )}
                                            {editLogoPreviewStatus === "idle" && (
                                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {editLogoPreviewStatus === "loading" && (
                                                <p className="text-xs text-muted-foreground">Loading preview...</p>
                                            )}
                                            {editLogoPreviewStatus === "loaded" && (
                                                <p className="text-xs text-muted-foreground">Logo preview loaded</p>
                                            )}
                                            {editLogoPreviewStatus === "error" && (
                                                <p className="text-xs text-destructive">Unable to load image. Please check the URL.</p>
                                            )}
                                            {editLogoPreviewStatus === "idle" && (
                                                <p className="text-xs text-muted-foreground">Enter a URL to preview</p>
                                            )}
                                        </div>
                                    </div>
                                )}
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
            <AlertDialog open={!!deleteApp} onOpenChange={() => setDeleteApplication(null)}>
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
