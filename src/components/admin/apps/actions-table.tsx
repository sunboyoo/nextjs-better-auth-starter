"use client";
import { Zap, Plus, Trash2, MoreHorizontal, Search, Pencil } from "lucide-react";
import { format } from "date-fns";
import useSWR from "swr";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
} from "@/components/ui/pagination";

const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const error = new Error(errorData.error || `API request failed: ${res.status}`);
        throw error;
    }
    return res.json();
};

interface Action {
    id: string;
    appId: string;
    resourceId: string;
    key: string;
    name: string;
    description: string | null;
    createdAt: string;
    appKey: string | null;
    resourceKey: string | null;
}

interface ActionsTableProps {
    appId: string;
    resourceId: string;
    resourceName: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export function ActionsTable({ appId, resourceId, resourceName }: ActionsTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Read initial values from URL or use defaults
    const urlPage = parseInt(searchParams.get("page") || String(DEFAULT_PAGE));
    const urlLimit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT));

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [page, setPage] = useState(urlPage);
    const [limit] = useState(urlLimit);

    // Create Form state
    const [newKey, setNewKey] = useState("");
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");

    // Edit Form state
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [editKey, setEditKey] = useState("");
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Update URL when page or search changes
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());

        if (debouncedSearch) params.set("search", debouncedSearch);
        else params.delete("search");

        // Always enforce page and limit in URL
        if (!searchParams.get("page") || !searchParams.get("limit")) {
            params.set("page", String(page));
            params.set("limit", String(limit));
            router.replace(`${pathname}?${params.toString()}`);
        } else if (parseInt(searchParams.get("page")!) !== page) {
            params.set("page", String(page));
            params.set("limit", String(limit));
            router.replace(`${pathname}?${params.toString()}`);
        } else {
            // Just update search if needed without loop
            const currentSearch = searchParams.get("search") || "";
            if (currentSearch !== debouncedSearch) {
                router.replace(`${pathname}?${params.toString()}`);
            }
        }
    }, [page, limit, router, pathname, searchParams, debouncedSearch]);

    const {
        data,
        mutate,
        error
    } = useSWR(`/api/admin/apps/${appId}/resources/${resourceId}/actions?page=${page}&limit=${limit}&search=${debouncedSearch}`, fetcher);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/admin/apps/${appId}/resources/${resourceId}/actions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resourceId,
                    key: newKey,
                    name: newName,
                    description: newDescription || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to create action");
                return;
            }

            setIsCreateOpen(false);
            setNewKey("");
            setNewName("");
            setNewDescription("");
            mutate();
        } catch (error) {
            console.error("Error creating action:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId) return;

        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/admin/apps/${appId}/resources/${resourceId}/actions/${editId}`, {
                method: "PUT", // Assuming PUT endpoint exists or will be created/is standard
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName,
                    description: editDescription || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to update action");
                return;
            }

            setIsUpdateOpen(false);
            setEditId(null);
            mutate();
        } catch (error) {
            console.error("Error updating action:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            await fetch(`/api/admin/apps/${appId}/resources/${resourceId}/actions/${deleteId}`, {
                method: "DELETE",
            });
            setDeleteId(null);
            mutate();
        } catch (error) {
            console.error("Error deleting action:", error);
        }
    };

    const actions: Action[] = data?.actions || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const renderPagination = () => {
        return (
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
                <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{actions.length}</span> of <span className="font-medium">{total}</span> actions
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
    };

    const columns = [
        { label: "Name" },
        { label: "Key" },
        { label: "Action Key String" },
        { label: "Description" },
        { label: "Created" },
        { label: "", className: "w-[50px]" },
    ];

    if (!data && !error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">Actions</h2>
                </div>
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden p-8 text-center text-muted-foreground">
                    Loading...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">Actions</h2>
                </div>
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden p-8 text-center text-destructive">
                    Failed to load actions: {error.message}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Actions</h2>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/50 text-xs font-medium text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" />
                    <span>{total}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 items-end justify-between">
                <div className="flex gap-2 items-end">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search actions..."
                            className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-[280px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Create action
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create action</DialogTitle>
                                <DialogDescription>
                                    Create action to {resourceName}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="actionKey">Key</Label>
                                    <Input
                                        id="actionKey"
                                        placeholder="create"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="actionName">Name</Label>
                                    <Input
                                        id="actionName"
                                        placeholder="Create Order"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="actionDescription">Description</Label>
                                    <Textarea
                                        id="actionDescription"
                                        placeholder="Permission to create orders"
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Creating..." : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

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
                        {actions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No actions found
                                </TableCell>
                            </TableRow>
                        ) : (
                            actions.map((action) => (
                                <TableRow key={action.id}>
                                    <TableCell className="px-4 py-3">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group"
                                            onClick={() => {
                                                setEditId(action.id);
                                                setEditKey(action.key);
                                                setEditName(action.name);
                                                setEditDescription(action.description || "");
                                                setIsUpdateOpen(true);
                                            }}
                                            title="Click to update action details"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 border border-blue-200/50 group-hover:border-blue-500/50 transition-colors">
                                                <Zap className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium group-hover:text-primary transition-colors">{action.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                            {action.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <code className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded font-mono border border-slate-200 dark:border-slate-700">
                                            {action.appKey}:{action.resourceKey}:{action.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-muted-foreground text-sm max-w-[200px] truncate" title={action.description || ""}>
                                        {action.description || "-"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-muted-foreground">
                                        {format(new Date(action.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditId(action.id);
                                                            setEditKey(action.key);
                                                            setEditName(action.name);
                                                            setEditDescription(action.description || "");
                                                            setIsUpdateOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Update
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteId(action.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {renderPagination()}
            </div>

            {/* Edit Action Dialog */}
            <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
                <DialogContent>
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Update action</DialogTitle>
                            <DialogDescription>
                                Update action details
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
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
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    placeholder="Create"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    placeholder="Action description"
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
                                onClick={() => setIsUpdateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Updating..." : "Update"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete action?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this action.
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
