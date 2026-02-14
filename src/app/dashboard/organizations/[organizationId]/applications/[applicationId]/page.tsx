"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/data/query-keys/user";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import {
    ArrowLeft,
    AppWindow,
    Layers,
    Zap,
    Shield,
    Pencil,
    Trash2,
    Loader2,
    CheckCircle,
    XCircle,
    Calendar,
    Hash,
    Info,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface AppDetail {
    id: string;
    organizationId: string;
    key: string;
    name: string;
    description: string | null;
    logo: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    resourceCount: number;
    actionCount: number;
    roleCount: number;
}

interface AppResponse {
    app: AppDetail;
    canWrite: boolean;
}

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
    });

export default function ApplicationDetailPage() {
    const { organizationId, applicationId } = useParams<{
        organizationId: string;
        applicationId: string;
    }>();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editLogo, setEditLogo] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const queryKey = userKeys.orgApp(organizationId, applicationId);

    const { data, isLoading, error } = useQuery<AppResponse>({
        queryKey,
        queryFn: () =>
            fetcher(
                `/api/user/organizations/${organizationId}/apps/${applicationId}`,
            ),
        refetchOnWindowFocus: false,
    });

    const app = data?.app;
    const canWrite = data?.canWrite ?? false;

    const openEdit = () => {
        if (!app) return;
        setEditName(app.name);
        setEditDescription(app.description || "");
        setEditLogo(app.logo || "");
        setIsEditOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(
                `/api/user/organizations/${organizationId}/apps/${applicationId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: editName,
                        description: editDescription || null,
                        logo: editLogo || null,
                    }),
                    credentials: "include",
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to update");
            }
            setIsEditOpen(false);
            await queryClient.invalidateQueries({ queryKey });
            toast.success("Application updated successfully");
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
                `/api/user/organizations/${organizationId}/apps/${applicationId}`,
                { method: "DELETE", credentials: "include" },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to delete");
            }
            toast.success("Application deleted successfully");
            router.push(
                `/dashboard/organizations/${organizationId}/applications`,
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

    if (error || !app) {
        return (
            <div className="space-y-4">
                <Link
                    href={`/dashboard/organizations/${organizationId}/applications`}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Applications
                </Link>
                <div className="rounded-xl border bg-card p-8 text-center">
                    <AppWindow className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Application not found
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <Link
                href={`/dashboard/organizations/${organizationId}/applications`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Applications
            </Link>

            {/* Header Card */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary border border-border/50">
                                <AppWindow className="h-7 w-7" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">
                                    {app.name}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                        {app.key}
                                    </code>
                                    <Badge
                                        variant={
                                            app.isActive
                                                ? "default"
                                                : "secondary"
                                        }
                                        className="text-[10px]"
                                    >
                                        {app.isActive ? (
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                        ) : (
                                            <XCircle className="h-3 w-3 mr-1" />
                                        )}
                                        {app.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
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
                    {app.description && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>{app.description}</p>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <Link
                            href={`/dashboard/organizations/${organizationId}/applications/${applicationId}/resources`}
                            className="rounded-lg border p-4 text-center hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                <Layers className="h-4 w-4" />
                                <span className="text-xs font-medium">
                                    Resources
                                </span>
                            </div>
                            <p className="text-2xl font-bold">
                                {app.resourceCount}
                            </p>
                        </Link>
                        <div className="rounded-lg border p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                <Zap className="h-4 w-4" />
                                <span className="text-xs font-medium">
                                    Actions
                                </span>
                            </div>
                            <p className="text-2xl font-bold">
                                {app.actionCount}
                            </p>
                        </div>
                        <div className="rounded-lg border p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                                <Shield className="h-4 w-4" />
                                <span className="text-xs font-medium">
                                    Roles
                                </span>
                            </div>
                            <p className="text-2xl font-bold">
                                {app.roleCount}
                            </p>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="rounded-lg border p-4 space-y-3">
                        <h3 className="text-sm font-semibold">Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3  text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Hash className="h-3.5 w-3.5" />
                                <span>ID:</span>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                    {app.id}
                                </code>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Created:</span>
                                <span className="text-foreground">
                                    {format(
                                        new Date(app.createdAt),
                                        "MMM d, yyyy HH:mm",
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Updated:</span>
                                <span className="text-foreground">
                                    {format(
                                        new Date(app.updatedAt),
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
                                href={`/dashboard/organizations/${organizationId}/applications/${applicationId}/resources`}
                            >
                                <Layers className="h-4 w-4 mr-1.5" />
                                Manage Resources
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
                                Edit Application
                            </DialogTitle>
                            <DialogDescription>
                                Update the application details.
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
                                    onChange={(e) =>
                                        setEditLogo(e.target.value)
                                    }
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
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete application?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{" "}
                            <span className="font-semibold">{app.name}</span>{" "}
                            and all associated resources, actions, and role
                            assignments. This action cannot be undone.
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
