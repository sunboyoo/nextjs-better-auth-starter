"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    ArrowLeft,
    Zap,
    Plus,
    Search,
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

interface ActionItem {
    id: string;
    resourceId: string;
    key: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ActionsResponse {
    resource: { id: string; name: string };
    actions: ActionItem[];
    total: number;
    canWrite: boolean;
}

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
    });

export default function ActionsPage() {
    const { organizationId, applicationId, resourceId } = useParams<{
        organizationId: string;
        applicationId: string;
        resourceId: string;
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
    const [deleteAction, setDeleteAction] = useState<{
        id: string;
        name: string;
    } | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const queryKey = userKeys.orgAppResourceActions(
        organizationId,
        applicationId,
        resourceId,
        debouncedSearch,
    );

    const { data, isLoading, error } = useQuery<ActionsResponse>({
        queryKey,
        queryFn: () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            return fetcher(
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${resourceId}/actions?${params.toString()}`,
            );
        },
        refetchOnWindowFocus: false,
    });

    const canWrite = data?.canWrite ?? false;
    const actionsList = data?.actions ?? [];

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${resourceId}/actions`,
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
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || "Failed to create");
            }
            setIsCreateOpen(false);
            setNewKey("");
            setNewName("");
            setNewDescription("");
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Action created successfully");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to create",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEdit = (action: ActionItem) => {
        setEditId(action.id);
        setEditName(action.name);
        setEditDescription(action.description || "");
        setIsEditOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${resourceId}/actions/${editId}`,
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
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || "Failed to update");
            }
            setIsEditOpen(false);
            setEditId(null);
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Action updated successfully");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to update",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteAction) return;
        try {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${resourceId}/actions/${deleteAction.id}`,
                { method: "DELETE", credentials: "include" },
            );
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || "Failed to delete");
            }
            setDeleteAction(null);
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Action deleted successfully");
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
                href={`/dashboard/organizations/${organizationId}/applications/${applicationId}/resources/${resourceId}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to {data?.resource?.name || "Resource"}
            </Link>

            {/* Header */}
            <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Actions</h2>
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
                        placeholder="Search actions..."
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
                                Create Action
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Zap className="h-5 w-5" />
                                        Create Action
                                    </DialogTitle>
                                    <DialogDescription>
                                        Add a new action to this resource.
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
                                                placeholder="Create Order"
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
                                                placeholder="create"
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
                                            placeholder="Describe the action..."
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
                                    colSpan={canWrite ? 5 : 4}
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
                                    colSpan={canWrite ? 5 : 4}
                                    className="h-24 text-center text-destructive"
                                >
                                    Failed to load actions
                                </TableCell>
                            </TableRow>
                        ) : actionsList.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={canWrite ? 5 : 4}
                                    className="text-center py-12 text-muted-foreground"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                            <Zap className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">
                                                No actions found
                                            </p>
                                            <p className="text-xs mt-1">
                                                {search
                                                    ? "Try adjusting your search"
                                                    : canWrite
                                                        ? "Create your first action"
                                                        : "No actions have been created yet"}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            actionsList.map((action) => (
                                <TableRow
                                    key={action.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() =>
                                        router.push(
                                            `/dashboard/organizations/${organizationId}/applications/${applicationId}/resources/${resourceId}/actions/${action.id}`,
                                        )
                                    }
                                >
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-border/50">
                                                <Zap className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-sm">
                                                {action.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                            {action.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                                        {action.description || "—"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(
                                            new Date(action.createdAt),
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
                                                                    action,
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
                                                                setDeleteAction(
                                                                    {
                                                                        id: action.id,
                                                                        name: action.name,
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

                {actionsList.length > 0 && (
                    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium">
                                {actionsList.length}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium">
                                {data?.total || 0}
                            </span>{" "}
                            actions
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
                                Edit Action
                            </DialogTitle>
                            <DialogDescription>
                                Update the action details.
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
                open={!!deleteAction}
                onOpenChange={() => setDeleteAction(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete action?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{" "}
                            <span className="font-semibold">
                                {deleteAction?.name}
                            </span>
                            . This action cannot be undone.
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
