"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import {
    ArrowLeft,
    Layers,
    Zap,
    Pencil,
    Trash2,
    Loader2,
    Calendar,
    Hash,
    Info,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
} from "@/components/ui/alert-dialog";

interface ResourceDetail {
    id: string;
    appId: string;
    key: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    actionCount: number;
}

interface ResourceResponse {
    resource: ResourceDetail;
    appName: string;
    canWrite: boolean;
}

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
    });

export default function ResourceDetailPage() {
    const { organizationId, applicationId, resourceId } = useParams<{
        organizationId: string;
        applicationId: string;
        resourceId: string;
    }>();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const queryKey = userKeys.orgAppResource(
        organizationId,
        applicationId,
        resourceId,
    );

    const { data, isLoading, error } = useQuery<ResourceResponse>({
        queryKey,
        queryFn: () =>
            fetcher(
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${resourceId}`,
            ),
        refetchOnWindowFocus: false,
    });

    const resource = data?.resource;
    const canWrite = data?.canWrite ?? false;

    const openEdit = () => {
        if (!resource) return;
        setEditName(resource.name);
        setEditDescription(resource.description || "");
        setIsEditOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${resourceId}`,
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
        try {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/apps/${applicationId}/resources/${resourceId}`,
                { method: "DELETE", credentials: "include" },
            );
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || "Failed to delete");
            }
            toast.success("Resource deleted successfully");
            router.push(
                `/dashboard/organizations/${organizationId}/applications/${applicationId}/resources`,
            );
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to delete",
            );
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !resource) {
        return (
            <div className="space-y-4">
                <Link
                    href={`/dashboard/organizations/${organizationId}/applications/${applicationId}/resources`}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Resources
                </Link>
                <div className="rounded-xl border bg-card p-8 text-center">
                    <Layers className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Resource not found
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <Link
                href={`/dashboard/organizations/${organizationId}/applications/${applicationId}/resources`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Resources
            </Link>

            {/* Header Card */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-border/50">
                                <Layers className="h-7 w-7" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">
                                    {resource.name}
                                </CardTitle>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono mt-1 inline-block">
                                    {resource.key}
                                </code>
                            </div>
                        </div>
                        {canWrite && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={openEdit}
                                >
                                    <Pencil className="h-4 w-4 mr-1.5" />
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setIsDeleteOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-1.5" />
                                    Delete
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                    {resource.description && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>{resource.description}</p>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 gap-4 max-w-xs">
                        <Link
                            href={`/dashboard/organizations/${organizationId}/applications/${applicationId}/resources/${resourceId}/actions`}
                            className="rounded-lg border p-4 text-center hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                <Zap className="h-4 w-4" />
                                <span className="text-xs font-medium">
                                    Actions
                                </span>
                            </div>
                            <p className="text-2xl font-bold">
                                {resource.actionCount}
                            </p>
                        </Link>
                    </div>

                    {/* Details */}
                    <div className="rounded-lg border p-4 space-y-3">
                        <h3 className="text-sm font-semibold">Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Hash className="h-3.5 w-3.5" />
                                <span>ID:</span>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                    {resource.id}
                                </code>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Created:</span>
                                <span className="text-foreground">
                                    {format(
                                        new Date(resource.createdAt),
                                        "MMM d, yyyy HH:mm",
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Updated:</span>
                                <span className="text-foreground">
                                    {format(
                                        new Date(resource.updatedAt),
                                        "MMM d, yyyy HH:mm",
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                href={`/dashboard/organizations/${organizationId}/applications/${applicationId}/resources/${resourceId}/actions`}
                            >
                                <Zap className="h-4 w-4 mr-1.5" />
                                Manage Actions
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

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
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete resource?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{" "}
                            <span className="font-semibold">
                                {resource.name}
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
