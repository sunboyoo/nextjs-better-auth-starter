"use client";
import { Building2, Search, Plus, Users, Trash2, Shield, FileJson, Settings2, Save, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";


import { JsonEditor } from "json-edit-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { MoreHorizontal } from "lucide-react";
import { OrganizationAddDialog } from "./organization-add-dialog";
import { OrganizationEditDialog } from "./organization-edit-dialog";

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: string;
    metadata: string | null;
    memberCount: number;

    roleCount: number;
}

export function OrganizationsTable() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [metadataViewOpen, setMetadataViewOpen] = useState(false);
    const [metadataToView, setMetadataToView] = useState<any>({});
    const [organizationIdForMetadata, setOrganizationIdForMetadata] = useState<string | null>(null);
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [editedMetadata, setEditedMetadata] = useState<any>({});
    const [isSavingMetadata, setIsSavingMetadata] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [brokenLogos, setBrokenLogos] = useState<Set<string>>(() => new Set());

    const [organizationToDelete, setOrganizationToDelete] = useState<{ id: string; name: string } | null>(null);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const limit = 10;

    const cloneJson = (value: any) => JSON.parse(JSON.stringify(value ?? {}));

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (page) params.set("page", String(page));
        params.set("limit", String(limit));
        router.replace(`?${params.toString()}`);
    }, [debouncedSearch, page, router]);

    const markLogoBroken = useCallback((key: string) => {
        setBrokenLogos((prev) => {
            if (prev.has(key)) return prev;
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    }, []);

    // Build SWR key
    const swrKey = useMemo(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        params.set("page", String(page));
        params.set("limit", String(limit));
        return `/api/admin/organizations?${params.toString()}`;
    }, [debouncedSearch, page, limit]);

    const { data, error, isLoading } = useQuery({
        queryKey: adminKeys.organizations(swrKey),
        queryFn: () => fetcher(swrKey),
        refetchOnWindowFocus: false,
        staleTime: 2000,
    });

    const deleteOrganizationMutation = useMutation({
        mutationFn: async (organizationId: string) =>
            fetch(`/api/admin/organizations/${organizationId}`, {
                method: "DELETE",
            }),
    });

    const saveMetadataMutation = useMutation({
        mutationFn: async ({
            organizationId,
            metadata,
        }: {
            organizationId: string;
            metadata: unknown;
        }) =>
            fetch(`/api/admin/organizations/${organizationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ metadata }),
            }),
    });

    const openDeleteConfirm = (organizationId: string, organizationName: string) => {
        setOrganizationToDelete({ id: organizationId, name: organizationName });
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!organizationToDelete) return;

        setDeletingId(organizationToDelete.id);
        setDeleteConfirmOpen(false);
        try {
            const response = await deleteOrganizationMutation.mutateAsync(organizationToDelete.id);

            if (response.ok) {
                await queryClient.invalidateQueries({
                    queryKey: adminKeys.organizations(swrKey),
                });
            } else {
                const data = await response.json();
                alert(data.error || "Failed to delete organization");
            }
        } catch (error) {
            alert("Failed to delete organization");
        } finally {
            setDeletingId(null);
            setOrganizationToDelete(null);
        }
    };



    const openMetadataView = (metadata: string | null, organizationId: string) => {
        try {
            const parsed = metadata ? JSON.parse(metadata) : {};
            setMetadataToView(cloneJson(parsed));
            setEditedMetadata(cloneJson(parsed));
            setOrganizationIdForMetadata(organizationId);
            setIsEditingMetadata(false);
            setMetadataViewOpen(true);
        } catch (e) {
            alert("Invalid JSON metadata");
        }
    };

    const handleSaveMetadata = async () => {
        if (!organizationIdForMetadata) return;
        setIsSavingMetadata(true);
        try {
            const response = await saveMetadataMutation.mutateAsync({
                organizationId: organizationIdForMetadata,
                metadata: editedMetadata,
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) throw new Error(payload?.error || "Failed to update metadata");

            const nextMetadata = (() => {
                const raw = payload?.organization?.metadata;
                if (raw === undefined) return editedMetadata ?? {};
                if (raw === null) return {};
                try {
                    return JSON.parse(raw);
                } catch {
                    return editedMetadata ?? {};
                }
            })();

            const nextMetadataClone = cloneJson(nextMetadata);
            await queryClient.invalidateQueries({
                queryKey: adminKeys.organizations(swrKey),
            });
            setMetadataToView(nextMetadataClone);
            setEditedMetadata(nextMetadataClone);
            setIsEditingMetadata(false);
        } catch (error) {
            console.error("Failed to save metadata:", error);
            alert("Failed to save metadata");
        } finally {
            setIsSavingMetadata(false);
        }
    };

    const filterControls = (
        <div className="flex items-center justify-between gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search organizations..."
                    className="pl-10 pr-4 py-2.5 border border-input rounded-lg text-sm bg-background w-[280px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                />
            </div>
            <Button
                onClick={() => setIsAddDialogOpen(true)}
                size="lg"
                className="flex items-center gap-2"
            >
                <Plus className="h-4 w-4" />
                Create organization
            </Button>
        </div>
    );

    // Pagination component
    const renderPagination = () => {
        const totalPages = data?.totalPages || 1;

        return (
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-4">
                <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{organizations.length}</span> of <span className="font-medium">{total}</span> organizations
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">
                        Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-8 w-8 p-0"
                        >
                            <span className="sr-only">Previous page</span>
                            <span aria-hidden="true">‹</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
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

    if (error) return <div>Failed to load organizations</div>;

    const handleOrganizationMutationSuccess = () => {
        void queryClient.invalidateQueries({
            queryKey: adminKeys.organizations(swrKey),
        });
    };

    const columns = [
        { label: "Organization" },
        { label: "Slug" },
        { label: "Members" },
        { label: "Organization Roles" },
        { label: "Metadata", className: "w-[50px]" },
        { label: "Created At" },
        { label: "Actions", className: "w-[50px]" },
    ];

    if (!data || isLoading) {
        return (
            <div className="space-y-4">
                {filterControls}
                <div className="overflow-hidden rounded-lg border-muted border-2">
                    <Table className="text-sm">
                        <TableHeader className="bg-muted">
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.label} className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 3 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-lg" />
                                            <Skeleton className="h-4 w-[150px]" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[100px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-6 w-[60px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[120px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-6 w-[120px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[100px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-4 w-[120px]" />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    const { organizations, total } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Organizations</h2>
                <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="font-medium">{total}</span>
                </Badge>
            </div>
            {filterControls}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table className="text-sm">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead
                                    key={col.label}
                                    className={[col.className, "px-4 py-3 text-xs font-medium text-muted-foreground"]
                                        .filter(Boolean)
                                        .join(" ")}
                                >
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {organizations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No organizations found
                                </TableCell>
                            </TableRow>
                        ) : (
                            organizations.map((organization: Organization) => {
                                const logoKey = `${organization.id}:${organization.logo ?? ""}`;
                                const showLogo = Boolean(organization.logo) && !brokenLogos.has(logoKey);

                                return (
                                    <TableRow key={organization.id}>
                                        <TableCell className="px-4 py-3">
                                            <Link
                                                href={`/admin/organizations/${organization.id}`}
                                                className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                                                title="View organization details"
                                            >
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden border border-border/50 group-hover:border-primary/50 transition-colors relative">
                                                    {showLogo ? (
                                                        <Image
                                                            src={organization.logo ?? ""}
                                                            alt={organization.name}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                            onError={() => markLogoBroken(logoKey)}
                                                        />
                                                    ) : (
                                                        <Building2 className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <span className="font-medium group-hover:text-primary transition-colors">{organization.name}</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                                {organization.slug}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Link href={`/admin/organizations/${organization.id}/members`}>
                                                <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors cursor-pointer gap-1.5 pl-2.5 pr-3 py-1">
                                                    <Users className="h-3.5 w-3.5 opacity-70" />
                                                    <span>{organization.memberCount}</span>
                                                </Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Link href={`/admin/organizations/${organization.id}/roles`}>
                                                <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors cursor-pointer gap-1.5 pl-2.5 pr-3 py-1">
                                                    <Shield className="h-3.5 w-3.5 opacity-70" />
                                                    <span>{organization.roleCount || 0}</span>
                                                </Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => openMetadataView(organization.metadata, organization.id)}
                                                title="View Metadata"
                                            >
                                                <FileJson className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                            {format(new Date(organization.createdAt), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => openDeleteConfirm(organization.id, organization.name)}
                                                        disabled={deletingId === organization.id}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        {deletingId === organization.id ? "Deleting..." : "Delete"}
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
            <OrganizationAddDialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                onSuccess={handleOrganizationMutationSuccess}
            />

            <OrganizationEditDialog
                isOpen={!!editingOrg}
                onClose={() => setEditingOrg(null)}
                onSuccess={handleOrganizationMutationSuccess}
                organization={editingOrg}
            />

            <Dialog open={metadataViewOpen} onOpenChange={setMetadataViewOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            {isEditingMetadata ? <Settings2 className="h-5 w-5 text-primary" /> : <FileJson className="h-5 w-5 text-primary" />}
                            {isEditingMetadata ? "Update Metadata" : "Organization Metadata"}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            {isEditingMetadata
                                ? "Modify the JSON object below. Make sure the format is valid before saving."
                                : "View the raw JSON metadata associated with this organization."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-md bg-zinc-50/50 dark:bg-zinc-900/50 p-4">
                        <JsonEditor
                            data={(isEditingMetadata ? editedMetadata : metadataToView) ?? {}}
                            setData={isEditingMetadata ? setEditedMetadata : undefined}
                            viewOnly={!isEditingMetadata}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-2">
                        {isEditingMetadata ? (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setIsEditingMetadata(false);
                                        setEditedMetadata(cloneJson(metadataToView));
                                    }}
                                    disabled={isSavingMetadata}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveMetadata} disabled={isSavingMetadata} className="gap-2">
                                    {isSavingMetadata ? (
                                        "Saving..."
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save changes
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditingMetadata(true)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                Update metadata
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{organizationToDelete?.name}&quot;? This action cannot be undone and will remove all members and data associated with this organization.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
