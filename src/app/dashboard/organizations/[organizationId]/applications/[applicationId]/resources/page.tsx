"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    Layers,
    Plus,
    Search,
    Zap,
    Pencil,
    Trash2,
    Loader2,
    MoreHorizontal,
    ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { useUrlPagination } from "@/hooks/use-url-pagination";
import { PaginationControls } from "@/components/pagination-controls";

interface Resource {
    id: string;
    applicationId: string;
    key: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    actionCount: number;
}

interface ResourcesResponse {
    application: { id: string; name: string };
    resources: Resource[];
    total: number;
    canWrite: boolean;
}

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
    });

export default function ResourcesPage() {
    const { organizationId, applicationId } = useParams<{
        organizationId: string;
        applicationId: string;
    }>();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("name-asc");

    // Create form
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newName, setNewName] = useState("");
    const [isNewKeyManuallyEdited, setIsNewKeyManuallyEdited] = useState(false);
    const [newDescription, setNewDescription] = useState("");

    // Edit form
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");

    // Delete
    const [deleteResource, setDeleteResource] = useState<{
        id: string;
        name: string;
    } | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const queryKey = userKeys.organizationApplicationResources(
        organizationId,
        applicationId,
        debouncedSearch,
    );

    const { data, isLoading, error } = useQuery<ResourcesResponse>({
        queryKey,
        queryFn: () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            return fetcher(
                `/api/user/organizations/${organizationId}/applications/${applicationId}/resources?${params.toString()}`,
            );
        },
        refetchOnWindowFocus: false,
    });

    const canWrite = data?.canWrite ?? false;

    const resourcesList = useMemo(() => {
        const list = data?.resources ?? [];
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
    }, [data?.resources, sortBy]);

    const {
        currentPage,
        totalPages,
        limit,
        totalCount,
        paginatedItems: paginatedResources,
        onPageChange,
        onLimitChange,
    } = useUrlPagination(resourcesList, { isDataReady: !isLoading });

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
            const res = await fetch(
                `/api/user/organizations/${organizationId}/applications/${applicationId}/resources`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        key: newKey,
                        name: newName,
                        description: newDescription || null,
                    }),
                    credentials: "include",
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to create");
            }
            setIsCreateOpen(false);
            setNewKey("");
            setNewName("");
            setIsNewKeyManuallyEdited(false);
            setNewDescription("");
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Resource created successfully");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to create",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEdit = (resource: Resource) => {
        setEditId(resource.id);
        setEditName(resource.name);
        setEditDescription(resource.description || "");
        setIsEditOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/applications/${applicationId}/resources/${editId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: editName,
                        description: editDescription || null,
                    }),
                    credentials: "include",
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to update");
            }
            setIsEditOpen(false);
            setEditId(null);
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Resource updated successfully");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to update",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteResource) return;
        try {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/applications/${applicationId}/resources/${deleteResource.id}`,
                { method: "DELETE", credentials: "include" },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to delete");
            }
            setDeleteResource(null);
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Resource deleted successfully");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to delete",
            );
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter & Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-2">
                <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-end sm:gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search resources..."
                            className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-full sm:w-[260px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
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
                {canWrite && (
                    <Dialog
                        open={isCreateOpen}
                        onOpenChange={setIsCreateOpen}
                    >
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Create Resource
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Layers className="h-5 w-5" />
                                        Create Resource
                                    </DialogTitle>
                                    <DialogDescription>
                                        Add a new resource to this application.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-name">
                                            Name
                                        </Label>
                                        <Input
                                            id="create-name"
                                            placeholder="Orders"
                                            value={newName}
                                            onChange={(e) =>
                                                handleNewNameChange(e.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-key">
                                            Key
                                        </Label>
                                        <Input
                                            id="create-key"
                                            placeholder="orders"
                                            value={newKey}
                                            onChange={(e) =>
                                                handleNewKeyChange(e.target.value)
                                            }
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Lowercase letters, numbers,
                                            underscores only
                                        </p>
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
                                            placeholder="Describe the resource..."
                                            value={newDescription}
                                            onChange={(e) =>
                                                setNewDescription(
                                                    e.target.value,
                                                )
                                            }
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsCreateOpen(false)
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

            {/* Resources Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Loading resources...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <p className="text-sm text-destructive">Failed to load resources</p>
                </div>
            ) : resourcesList.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Layers className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">No resources found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {search
                                    ? "Try adjusting your search"
                                    : canWrite
                                        ? "Create your first resource"
                                        : "No resources have been created yet"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {paginatedResources.map((resource) => (
                            <Card
                                key={resource.id}
                                className="group cursor-pointer transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
                                onClick={() =>
                                    router.push(
                                        `/dashboard/organizations/${organizationId}/applications/${applicationId}/resources/${resource.id}`,
                                    )
                                }
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-border/50">
                                                <Layers className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {resource.name}
                                                </h3>
                                                <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                                    {resource.key}
                                                </code>
                                            </div>
                                        </div>
                                        {canWrite && (
                                            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEdit(resource)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => setDeleteResource({ id: resource.id, name: resource.name })}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                    {resource.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {resource.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Zap className="h-3.5 w-3.5 opacity-70" />
                                            {resource.actionCount} action{resource.actionCount !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t">
                                        <span className="text-[11px] text-muted-foreground">
                                            Created {format(new Date(resource.createdAt), "MMM d, yyyy")}
                                        </span>
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

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5" />
                                Edit Resource
                            </DialogTitle>
                            <DialogDescription>
                                Update the resource details.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editName}
                                    onChange={(e) =>
                                        setEditName(e.target.value)
                                    }
                                    required
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
                                    onChange={(e) =>
                                        setEditDescription(e.target.value)
                                    }
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
            <AlertDialog
                open={!!deleteResource}
                onOpenChange={() => setDeleteResource(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete resource?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{" "}
                            <span className="font-semibold">
                                {deleteResource?.name}
                            </span>{" "}
                            and all associated actions. This action cannot be
                            undone.
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
