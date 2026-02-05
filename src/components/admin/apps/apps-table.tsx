"use client";
import {
    Box,
    Search,
    Plus,
    Trash2,
    MoreHorizontal,
    Pencil,
    Layers,
    Zap,
    FileText,
    Key,
    Type,
    ImageIcon,
    Filter,
    CheckCircle,
    XCircle
} from "lucide-react";
import { format } from "date-fns";
import useSWR from "swr";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

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
    roleCount?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export function AppsTable() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Read initial values from URL or use defaults
    const urlPage = parseInt(searchParams.get("page") || String(DEFAULT_PAGE));
    const urlLimit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT));

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [statusFilter, setStatusFilter] = useState(searchParams.get("isActive") || "all");
    const [page, setPage] = useState(urlPage);
    const [limit] = useState(urlLimit);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [deleteAppId, setDeleteAppId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [brokenLogos, setBrokenLogos] = useState<Set<string>>(() => new Set());

    // Create form state
    const [newAppKey, setNewAppKey] = useState("");
    const [newAppName, setNewAppName] = useState("");
    const [newAppDescription, setNewAppDescription] = useState("");
    const [newAppLogo, setNewAppLogo] = useState("");
    const [newAppLogoInvalid, setNewAppLogoInvalid] = useState(false);

    // Edit form state
    const [editAppId, setEditAppId] = useState<string | null>(null);
    const [editAppKey, setEditAppKey] = useState("");
    const [editAppName, setEditAppName] = useState("");
    const [editAppDescription, setEditAppDescription] = useState("");
    const [editAppLogo, setEditAppLogo] = useState("");
    const [editAppLogoInvalid, setEditAppLogoInvalid] = useState(false);

    // Toggle status state
    const [toggleStatusApp, setToggleStatusApp] = useState<{ id: string; name: string; newStatus: boolean } | null>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Sync URL with page/limit state
    const updateUrl = useCallback((newPage: number, newStatus: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedSearch) params.set("search", debouncedSearch);
        else params.delete("search");

        if (newStatus !== "all") params.set("isActive", newStatus === "active" ? "true" : "false");
        else params.delete("isActive");

        params.set("page", String(newPage));
        params.set("limit", String(limit));
        router.replace(`${pathname}?${params.toString()}`);
    }, [searchParams, pathname, router, limit, debouncedSearch]);

    // Update URL when filters change (only when actual filter values change)
    useEffect(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");
        params.set("page", String(page));
        params.set("limit", String(limit));
        router.replace(`${pathname}?${params.toString()}`);
    }, [debouncedSearch, page, router, pathname, limit, statusFilter]); // Removed searchParams to prevent infinite loop

    const markLogoBroken = useCallback((key: string) => {
        setBrokenLogos((prev) => {
            if (prev.has(key)) return prev;
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    }, []);

    // Build SWR key
    const isActiveQuery = statusFilter === "all" ? "" : `&isActive=${statusFilter === "active" ? "true" : "false"}`;
    const swrKey = `/api/admin/apps?search=${debouncedSearch}&page=${page}&limit=${limit}${isActiveQuery}`;

    const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 2000,
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/admin/apps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: newAppKey,
                    name: newAppName,
                    description: newAppDescription || null,
                    logo: newAppLogo || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to create app");
                return;
            }

            setIsCreateDialogOpen(false);
            setNewAppKey("");
            setNewAppName("");
            setNewAppDescription("");
            setNewAppLogo("");
            setNewAppLogoInvalid(false);
            mutate();
        } catch (error) {
            console.error("Error creating app:", error);
            alert("Failed to create app");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteAppId) return;

        try {
            const response = await fetch(`/api/admin/apps/${deleteAppId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                alert("Failed to delete app");
                return;
            }

            setDeleteAppId(null);
            mutate();
        } catch (error) {
            console.error("Error deleting app:", error);
            alert("Failed to delete app");
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editAppId) return;

        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/admin/apps/${editAppId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editAppName,
                    description: editAppDescription || null,
                    logo: editAppLogo || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to update app");
                return;
            }

            setIsUpdateDialogOpen(false);
            setEditAppId(null);
            setEditAppKey("");
            setEditAppName("");
            setEditAppDescription("");
            setEditAppLogo("");
            setEditAppLogoInvalid(false);
            mutate();
        } catch (error) {
            console.error("Error updating app:", error);
            alert("Failed to update app");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderPagination = () => {
        // const totalPages = data?.totalPages || 1; // Already available in larger scope, but safer here
        return (
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
                <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{apps.length}</span> of <span className="font-medium">{total}</span> applications
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

    if (error) return <div>Failed to load applications</div>;

    const apps: App[] = data?.apps || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const filterControls = (
        <div className="flex flex-wrap gap-2 items-end justify-between">
            <div className="flex gap-2 items-end">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search applications..."
                        className="pl-10 pr-4 py-2 border rounded-md text-sm bg-background w-[280px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-[140px] flex items-center gap-2">
                        <span className="flex items-center gap-2">
                            {statusFilter === "all" ? (
                                <Filter className="w-4 h-4" />
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
                        <SelectItem value="all">
                            <span className="flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                All status
                            </span>
                        </SelectItem>
                        <SelectItem value="active">
                            <span className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Active
                            </span>
                        </SelectItem>
                        <SelectItem value="inactive">
                            <span className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-destructive" />
                                Inactive
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create application
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Box className="h-5 w-5" />
                                Create application
                            </DialogTitle>
                            <DialogDescription>
                                Create application to the RBAC system
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">App Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Order System"
                                        value={newAppName}
                                        onChange={(e) => setNewAppName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="key">Key</Label>
                                    <Input
                                        id="key"
                                        placeholder="order_system"
                                        value={newAppKey}
                                        onChange={(e) => setNewAppKey(e.target.value)}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Unique identifier (lowercase, no spaces)
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="logo">Logo URL <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <Input
                                            id="logo"
                                            placeholder="https://example.com/logo.png"
                                            value={newAppLogo}
                                            onChange={(e) => {
                                                setNewAppLogo(e.target.value);
                                                if (newAppLogoInvalid) setNewAppLogoInvalid(false);
                                            }}
                                        />
                                        <p className="text-[0.8rem] text-muted-foreground mt-1.5">
                                            Enter direct URL to your application&apos;s logo image.
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        <div className="h-20 w-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden relative">
                                            {newAppLogo ? (
                                                newAppLogoInvalid ? (
                                                    <span className="text-xs text-muted-foreground font-medium">Invalid</span>
                                                ) : (
                                                    <Image
                                                        src={newAppLogo}
                                                        alt="Preview"
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                        onError={() => setNewAppLogoInvalid(true)}
                                                    />
                                                )
                                            ) : (
                                                <Box className="h-8 w-8 text-muted-foreground/50" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                                <Textarea
                                    id="description"
                                    placeholder="Order management application"
                                    value={newAppDescription}
                                    onChange={(e) => setNewAppDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );

    const columns = [
        { label: "Name" },
        { label: "Key" },
        { label: "Description" },
        { label: "Resources" },
        { label: "Actions" },
        { label: "Status" },
        { label: "Created" },
        { label: "", className: "w-[50px]" },
    ];

    if (!data || isLoading) {
        return (
            <div className="space-y-4">
                {filterControls}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <Table className="text-sm">
                        <TableHeader className="bg-muted">
                            <TableRow>
                                {columns.map((col, i) => (
                                    <TableHead key={i}>{col.label}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Applications</h2>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/50 text-xs font-medium text-muted-foreground">
                    <Box className="h-3.5 w-3.5" />
                    <span>{total}</span>
                </div>
            </div>

            {filterControls}

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
                        {apps.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No applications found
                                </TableCell>
                            </TableRow>
                        ) : (
                            apps.map((app) => {
                                const logoKey = `${app.id}:${app.logo ?? ""}`;
                                const showLogo = Boolean(app.logo) && !brokenLogos.has(logoKey);

                                return (
                                    <TableRow key={app.id}>
                                        <TableCell className="px-4 py-3">
                                            <div
                                                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group"
                                                onClick={() => {
                                                    setEditAppId(app.id);
                                                    setEditAppKey(app.key);
                                                    setEditAppName(app.name);
                                                    setEditAppDescription(app.description || "");
                                                    setEditAppLogo(app.logo || "");
                                                    setEditAppLogoInvalid(false);
                                                    setIsUpdateDialogOpen(true);
                                                }}
                                                title="Click to update application details"
                                            >
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden border border-border/50 group-hover:border-primary/50 transition-colors relative">
                                                    {showLogo ? (
                                                        <Image
                                                            src={app.logo ?? ""}
                                                            alt={app.name}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                            onError={() => markLogoBroken(logoKey)}
                                                        />
                                                    ) : (
                                                        <Box className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <span className="font-medium group-hover:text-primary transition-colors">{app.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                                {app.key}
                                            </code>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                                            {app.description || "-"}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <button
                                                onClick={() => router.push(`/admin/apps/${app.id}/resources`)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/30 text-xs font-medium hover:bg-muted/50 transition-colors cursor-pointer"
                                            >
                                                <Layers className="h-3.5 w-3.5 opacity-70" />
                                                {app.resourceCount || 0}
                                            </button>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/30 text-xs font-medium text-muted-foreground">
                                                <Zap className="h-3.5 w-3.5 opacity-70" />
                                                {app.actionCount || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={app.isActive}
                                                    onCheckedChange={(checked) => {
                                                        setToggleStatusApp({
                                                            id: app.id,
                                                            name: app.name,
                                                            newStatus: checked,
                                                        });
                                                    }}
                                                />
                                                <span className={`text-xs font-medium ${app.isActive ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}`}>
                                                    {app.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                            {format(new Date(app.createdAt), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
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
                                                            setEditAppId(app.id);
                                                            setEditAppKey(app.key);
                                                            setEditAppName(app.name);
                                                            setEditAppDescription(app.description || "");
                                                            setEditAppLogo(app.logo || "");
                                                            setEditAppLogoInvalid(false);
                                                            setIsUpdateDialogOpen(true);
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
                                                            setDeleteAppId(app.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {renderPagination()}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteAppId} onOpenChange={() => setDeleteAppId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete application?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the application and all associated
                            resources, actions, and role assignments. This action cannot be
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

            {/* Edit Profile Dialog */}
            <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5" />
                                Update application
                            </DialogTitle>
                            <DialogDescription>
                                Update the application details.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Name</Label>
                                    <Input
                                        id="edit-name"
                                        placeholder="Order System"
                                        value={editAppName}
                                        onChange={(e) => setEditAppName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-key">Key</Label>
                                    <Input
                                        id="edit-key"
                                        value={editAppKey}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Key cannot be changed
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-logo">Logo URL <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <Input
                                            id="edit-logo"
                                            placeholder="https://example.com/logo.png"
                                            value={editAppLogo}
                                            onChange={(e) => {
                                                setEditAppLogo(e.target.value);
                                                if (editAppLogoInvalid) setEditAppLogoInvalid(false);
                                            }}
                                        />
                                        <p className="text-[0.8rem] text-muted-foreground mt-1.5">
                                            Enter direct URL to your application&apos;s logo image.
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        <div className="h-20 w-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden relative">
                                            {editAppLogo ? (
                                                editAppLogoInvalid ? (
                                                    <span className="text-xs text-muted-foreground font-medium">Invalid</span>
                                                ) : (
                                                    <Image
                                                        src={editAppLogo}
                                                        alt="Preview"
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                        onError={() => setEditAppLogoInvalid(true)}
                                                    />
                                                )
                                            ) : (
                                                <Box className="h-8 w-8 text-muted-foreground/50" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                                <Textarea
                                    id="edit-description"
                                    placeholder="Order management application"
                                    value={editAppDescription}
                                    onChange={(e) => setEditAppDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsUpdateDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Toggle Status Confirmation Dialog */}
            <AlertDialog open={!!toggleStatusApp} onOpenChange={(open) => !open && setToggleStatusApp(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {toggleStatusApp?.newStatus ? "Activate" : "Deactivate"} application?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to {toggleStatusApp?.newStatus ? "activate" : "deactivate"}{" "}
                            <strong>{toggleStatusApp?.name}</strong>?
                            {!toggleStatusApp?.newStatus && (
                                <span className="block mt-2 text-destructive">
                                    Deactivating may affect users who depend on this application.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (!toggleStatusApp) return;
                                try {
                                    const response = await fetch(`/api/admin/apps/${toggleStatusApp.id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ isActive: toggleStatusApp.newStatus }),
                                    });
                                    if (response.ok) {
                                        mutate();
                                    } else {
                                        alert("Failed to update status");
                                    }
                                } catch {
                                    alert("Failed to update status");
                                }
                                setToggleStatusApp(null);
                            }}
                        >
                            {toggleStatusApp?.newStatus ? "Activate" : "Deactivate"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );

}
