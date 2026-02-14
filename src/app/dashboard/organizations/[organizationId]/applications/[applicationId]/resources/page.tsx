"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    ArrowLeft,
    Layers,
    Plus,
    Search,
    Zap,
    Pencil,
    Trash2,
    Loader2,
    MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface Resource {
    id: string;
    appId: string;
    key: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    actionCount: number;
}

interface ResourcesResponse {
    app: { id: string; name: string };
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

    // Create form
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newName, setNewName] = useState("");
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

    const queryKey = userKeys.orgAppResources(
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
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources?${params.toString()}`,
            );
        },
        refetchOnWindowFocus: false,
    });

    const canWrite = data?.canWrite ?? false;
    const resourcesList = data?.resources ?? [];

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources`,
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
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${editId}`,
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
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${deleteResource.id}`,
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
            {/* Back Link */}
            <Link
                href={`/dashboard/organizations/${organizationId}/applications/${applicationId}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to {data?.app?.name || "Application"}
            </Link>

            {/* Header */}
            <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Resources</h2>
                {data && (
                    <Badge variant="secondary" className="text-xs">
                        {data.total}
                    </Badge>
                )}
            </div>

            {/* Filter & Actions */}
            <div className="flex flex-wrap gap-2 items-end justify-between">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search resources..."
                        className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-[260px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="create-name">
                                                Name
                                            </Label>
                                            <Input
                                                id="create-name"
                                                placeholder="Orders"
                                                value={newName}
                                                onChange={(e) =>
                                                    setNewName(e.target.value)
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
                                                    setNewKey(e.target.value)
                                                }
                                                required
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Lowercase letters, numbers,
                                                underscores only
                                            </p>
                                        </div>
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

            {/* Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table className="text-sm">
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="px-4 py-3 text-xs font-medium">
                                Name
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">
                                Key
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">
                                Description
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">
                                Actions
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium">
                                Created
                            </TableHead>
                            {canWrite && (
                                <TableHead className="px-4 py-3 text-xs font-medium w-[50px]" />
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={canWrite ? 6 : 5}
                                    className="h-24 text-center"
                                >
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell
                                    colSpan={canWrite ? 6 : 5}
                                    className="h-24 text-center text-destructive"
                                >
                                    Failed to load resources
                                </TableCell>
                            </TableRow>
                        ) : resourcesList.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={canWrite ? 6 : 5}
                                    className="text-center py-12 text-muted-foreground"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                            <Layers className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">
                                                No resources found
                                            </p>
                                            <p className="text-xs mt-1">
                                                {search
                                                    ? "Try adjusting your search"
                                                    : canWrite
                                                        ? "Create your first resource"
                                                        : "No resources have been created yet"}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            resourcesList.map((resource) => (
                                <TableRow
                                    key={resource.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() =>
                                        router.push(
                                            `/dashboard/organizations/${organizationId}/applications/${applicationId}/resources/${resource.id}`,
                                        )
                                    }
                                >
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-border/50">
                                                <Layers className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-sm">
                                                {resource.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                            {resource.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                                        {resource.description || "—"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/30 text-xs font-medium text-muted-foreground">
                                            <Zap className="h-3.5 w-3.5 opacity-70" />
                                            {resource.actionCount}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(
                                            new Date(resource.createdAt),
                                            "MMM d, yyyy",
                                        )}
                                    </TableCell>
                                    {canWrite && (
                                        <TableCell className="px-4 py-3">
                                            <div
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                openEdit(
                                                                    resource,
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() =>
                                                                setDeleteResource(
                                                                    {
                                                                        id: resource.id,
                                                                        name: resource.name,
                                                                    },
                                                                )
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

                {resourcesList.length > 0 && (
                    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium">
                                {resourcesList.length}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium">
                                {data?.total || 0}
                            </span>{" "}
                            resources
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
