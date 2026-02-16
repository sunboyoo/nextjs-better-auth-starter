"use client";
import { FolderOpen, Plus, Trash2, MoreHorizontal, Search, Zap, Pencil, Layers } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { generateKeyFromName } from "@/lib/utils";

const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
        const error = new Error('API request failed');
        throw error;
    }
    return res.json();
};
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
type MutationInput = {
    url: string;
    method: "POST" | "PUT" | "DELETE";
    body?: unknown;
};

interface Resource {
    id: string;
    applicationId: string;
    key: string;
    name: string;
    description: string | null;
    createdAt: string;
    actionCount?: number;
}

interface ResourcesTableProps {
    applicationId: string;
}

export function ResourcesTable({ applicationId }: ResourcesTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const queryClient = useQueryClient();
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

    // Form state
    const [newKey, setNewKey] = useState("");
    const [newName, setNewName] = useState("");
    const [isNewKeyManuallyEdited, setIsNewKeyManuallyEdited] = useState(false);
    const [newDescription, setNewDescription] = useState("");

    // Edit form state
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

    // Sync URL with page/limit state
    const updateUrl = useCallback((newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedSearch) params.set("search", debouncedSearch);
        else params.delete("search");

        params.set("page", String(newPage));
        params.set("limit", String(limit));
        router.replace(`${pathname}?${params.toString()}`);
    }, [searchParams, pathname, router, limit, debouncedSearch]);

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

    const resourcesUrl = `/api/admin/applications/${applicationId}/resources?page=${page}&limit=${limit}&search=${debouncedSearch}`;
    const { data, error } = useQuery({
        queryKey: adminKeys.applicationResources(resourcesUrl),
        queryFn: () => fetcher(resourcesUrl),
    });

    const requestMutation = useMutation({
        mutationFn: async ({ url, method, body }: MutationInput) =>
            fetch(url, {
                method,
                headers: body === undefined ? undefined : { "Content-Type": "application/json" },
                body: body === undefined ? undefined : JSON.stringify(body),
            }),
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

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId) return;

        setIsSubmitting(true);

        try {
            const response = await requestMutation.mutateAsync({
                url: `/api/admin/applications/${applicationId}/resources/${editId}`,
                method: "PUT",
                body: {
                    name: editName,
                    description: editDescription || null,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to update resource");
                return;
            }

            setIsUpdateOpen(false);
            setEditId(null);
            await queryClient.invalidateQueries({
                queryKey: adminKeys.applicationResources(resourcesUrl),
            });
        } catch (error) {
            console.error("Error updating resource:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await requestMutation.mutateAsync({
                url: `/api/admin/applications/${applicationId}/resources`,
                method: "POST",
                body: {
                    applicationId,
                    key: newKey,
                    name: newName,
                    description: newDescription || null,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to create resource");
                return;
            }

            setIsCreateOpen(false);
            setNewKey("");
            setNewName("");
            setIsNewKeyManuallyEdited(false);
            setNewDescription("");
            await queryClient.invalidateQueries({
                queryKey: adminKeys.applicationResources(resourcesUrl),
            });
        } catch (error) {
            console.error("Error creating resource:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await requestMutation.mutateAsync({
                url: `/api/admin/applications/${applicationId}/resources/${deleteId}`,
                method: "DELETE",
            });
            if (!response.ok) {
                alert("Failed to delete resource");
                return;
            }
            setDeleteId(null);
            await queryClient.invalidateQueries({
                queryKey: adminKeys.applicationResources(resourcesUrl),
            });
        } catch (error) {
            console.error("Error deleting resource:", error);
        }
    };

    const resources: Resource[] = data?.resources || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const renderPagination = () => {
        return (
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
                <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{resources.length}</span> of <span className="font-medium">{total}</span> resources
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
        { label: "Description" },
        { label: "Actions" },
        { label: "Created" },
        { label: "", className: "w-[50px]" },
    ];

    if (!data && !error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">Resources</h2>
                </div>
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden p-8 text-center text-muted-foreground">
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Resources</h2>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/50 text-xs font-medium text-muted-foreground">
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span>{total}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 items-end justify-between">
                <div className="flex gap-2 items-end">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search resources..."
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
                            Create resource
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create resource</DialogTitle>
                                <DialogDescription>
                                    Create resource to this application
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="resourceName">Name</Label>
                                    <Input
                                        id="resourceName"
                                        placeholder="Orders"
                                        value={newName}
                                        onChange={(e) => handleNewNameChange(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="resourceKey">Key</Label>
                                    <Input
                                        id="resourceKey"
                                        placeholder="orders"
                                        value={newKey}
                                        onChange={(e) => handleNewKeyChange(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="resourceDescription">Description</Label>
                                    <Textarea
                                        id="resourceDescription"
                                        placeholder="Order management"
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
                        {resources.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No resources found
                                </TableCell>
                            </TableRow>
                        ) : (
                            resources.map((resource) => (
                                <TableRow
                                    key={resource.id}
                                >
                                    <TableCell className="px-4 py-3">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group"
                                            onClick={() => {
                                                setEditId(resource.id);
                                                setEditKey(resource.key);
                                                setEditName(resource.name);
                                                setEditDescription(resource.description || "");
                                                setIsUpdateOpen(true);
                                            }}
                                            title="Click to update resource details"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 border border-orange-200/50 group-hover:border-orange-500/50 transition-colors">
                                                <Layers className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium group-hover:text-primary transition-colors">{resource.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                            {resource.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-muted-foreground text-sm max-w-[200px] truncate" title={resource.description || ""}>
                                        {resource.description || "-"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <button
                                            onClick={() => router.push(`/admin/applications/${applicationId}/resources/${resource.id}/actions`)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/30 text-xs font-medium hover:bg-muted/50 transition-colors cursor-pointer text-foreground"
                                        >
                                            <Zap className="h-3.5 w-3.5 opacity-70" />
                                            {resource.actionCount || 0}
                                        </button>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-muted-foreground">
                                        {format(new Date(resource.createdAt), "MMM d, yyyy")}
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
                                                            setEditId(resource.id);
                                                            setEditKey(resource.key);
                                                            setEditName(resource.name);
                                                            setEditDescription(resource.description || "");
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
                                                            setDeleteId(resource.id);
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

            {/* Edit Resource Dialog */}
            <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
                <DialogContent>
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Update resource</DialogTitle>
                            <DialogDescription>
                                Update resource details
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    placeholder="Orders"
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
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    placeholder="Order management"
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
                        <AlertDialogTitle>Delete resource?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the resource and all its actions.
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
