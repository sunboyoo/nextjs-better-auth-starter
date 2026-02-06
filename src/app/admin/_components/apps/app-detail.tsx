"use client";
import {
    Box,
    ChevronLeft,
    Plus,
    Trash2,
    MoreHorizontal,
    FolderOpen,
    Zap,
} from "lucide-react";
import { format } from "date-fns";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/dropdown-menu";

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface Resource {
    id: string;
    appId: string;
    key: string;
    name: string;
    description: string | null;
    createdAt: string;
    actionCount?: number;
}

interface Action {
    id: string;
    appId: string;
    resourceId: string;
    key: string;
    name: string;
    description: string | null;
    createdAt: string;
    resourceName?: string;
}


interface AppDetailProps {
    appId: string;
    organizationId?: string;
}

export function AppDetail({ appId, organizationId }: AppDetailProps) {
    const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
    const [isCreateResourceOpen, setIsCreateResourceOpen] = useState(false);
    const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
    const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);
    const [deleteActionId, setDeleteActionId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [newResourceKey, setNewResourceKey] = useState("");
    const [newResourceName, setNewResourceName] = useState("");
    const [newResourceDescription, setNewResourceDescription] = useState("");
    const [newActionKey, setNewActionKey] = useState("");
    const [newActionName, setNewActionName] = useState("");
    const [newActionDescription, setNewActionDescription] = useState("");

    // Fetch app details
    const { data: appData, error: appError } = useSWR(
        `/api/admin/apps/${appId}`,
        fetcher
    );

    // Fetch resources
    const {
        data: resourcesData,
        mutate: mutateResources,
    } = useSWR(`/api/admin/apps/${appId}/resources`, fetcher);

    // Fetch actions for selected resource
    const {
        data: actionsData,
        mutate: mutateActions,
    } = useSWR(
        selectedResourceId
            ? `/api/admin/apps/${appId}/resources/${selectedResourceId}/actions`
            : null,
        fetcher
    );

    const handleCreateResource = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/admin/apps/${appId}/resources`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appId,
                    key: newResourceKey,
                    name: newResourceName,
                    description: newResourceDescription || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to create resource");
                return;
            }

            setIsCreateResourceOpen(false);
            setNewResourceKey("");
            setNewResourceName("");
            setNewResourceDescription("");
            mutateResources();
        } catch (error) {
            console.error("Error creating resource:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedResourceId) return;
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/admin/apps/${appId}/resources/${selectedResourceId}/actions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resourceId: selectedResourceId,
                    key: newActionKey,
                    name: newActionName,
                    description: newActionDescription || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Failed to create action");
                return;
            }

            setIsCreateActionOpen(false);
            setNewActionKey("");
            setNewActionName("");
            setNewActionDescription("");
            mutateActions();
            mutateResources();
        } catch (error) {
            console.error("Error creating action:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteResource = async () => {
        if (!deleteResourceId) return;

        try {
            await fetch(`/api/admin/apps/${appId}/resources/${deleteResourceId}`, {
                method: "DELETE",
            });
            setDeleteResourceId(null);
            if (selectedResourceId === deleteResourceId) {
                setSelectedResourceId(null);
            }
            mutateResources();
        } catch (error) {
            console.error("Error deleting resource:", error);
        }
    };

    const handleDeleteAction = async () => {
        if (!deleteActionId) return;

        try {
            await fetch(`/api/admin/apps/${appId}/resources/${selectedResourceId}/actions/${deleteActionId}`, {
                method: "DELETE",
            });
            setDeleteActionId(null);
            mutateActions();
            mutateResources();
        } catch (error) {
            console.error("Error deleting action:", error);
        }
    };

    if (appError) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-destructive">Failed to load application</p>
                </CardContent>
            </Card>
        );
    }

    const app = appData?.app;
    const resources: Resource[] = resourcesData?.resources || [];
    const actions: Action[] = actionsData?.actions || [];
    const selectedResource = resources.find((r) => r.id === selectedResourceId);

    return (
        <>
            {/* Header */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link
                    href={organizationId ? `/admin/rbac/organizations/${organizationId}/apps` : "/admin/rbac/apps"}
                    className="flex items-center gap-1 hover:text-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to applications
                </Link>
            </div>

            {/* App Info Card */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Box className="h-5 w-5" />
                                {app?.name || "Loading..."}
                            </CardTitle>
                            <CardDescription>
                                {app?.description || "No description"}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={app?.isActive ? "default" : "secondary"}>
                                {app?.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                {app?.key}
                            </code>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Resources & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resources Panel */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FolderOpen className="h-4 w-4" />
                                Resources
                            </CardTitle>
                            <Dialog open={isCreateResourceOpen} onOpenChange={setIsCreateResourceOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <form onSubmit={handleCreateResource}>
                                        <DialogHeader>
                                            <DialogTitle>Create resource</DialogTitle>
                                            <DialogDescription>
                                                Create resource to this application
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="resourceKey">Key</Label>
                                                <Input
                                                    id="resourceKey"
                                                    placeholder="orders"
                                                    value={newResourceKey}
                                                    onChange={(e) => setNewResourceKey(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="resourceName">Name</Label>
                                                <Input
                                                    id="resourceName"
                                                    placeholder="Orders"
                                                    value={newResourceName}
                                                    onChange={(e) => setNewResourceName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="resourceDescription">Description</Label>
                                                <Input
                                                    id="resourceDescription"
                                                    placeholder="Order management"
                                                    value={newResourceDescription}
                                                    onChange={(e) => setNewResourceDescription(e.target.value)}
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
                    </CardHeader>
                    <CardContent>
                        {resources.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-center">
                                <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-muted-foreground text-sm">No resources yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {resources.map((resource) => (
                                    <div
                                        key={resource.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedResourceId === resource.id
                                            ? "bg-primary/10 border-primary"
                                            : "hover:bg-muted/50"
                                            }`}
                                        onClick={() => setSelectedResourceId(resource.id)}
                                    >
                                        <div>
                                            <p className="font-medium">{resource.name}</p>
                                            <code className="text-xs text-muted-foreground">
                                                {resource.key}
                                            </code>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{resource.actionCount || 0} actions</Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteResourceId(resource.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions Panel */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Zap className="h-4 w-4" />
                                Actions
                                {selectedResource && (
                                    <span className="text-muted-foreground font-normal">
                                        - {selectedResource.name}
                                    </span>
                                )}
                            </CardTitle>
                            {selectedResourceId && (
                                <Dialog open={isCreateActionOpen} onOpenChange={setIsCreateActionOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <form onSubmit={handleCreateAction}>
                                            <DialogHeader>
                                                <DialogTitle>Create action</DialogTitle>
                                                <DialogDescription>
                                                    Create action to {selectedResource?.name}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="actionKey">Key</Label>
                                                    <Input
                                                        id="actionKey"
                                                        placeholder="create"
                                                        value={newActionKey}
                                                        onChange={(e) => setNewActionKey(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="actionName">Name</Label>
                                                    <Input
                                                        id="actionName"
                                                        placeholder="Create Order"
                                                        value={newActionName}
                                                        onChange={(e) => setNewActionName(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="actionDescription">Description</Label>
                                                    <Input
                                                        id="actionDescription"
                                                        placeholder="Permission to create orders"
                                                        value={newActionDescription}
                                                        onChange={(e) => setNewActionDescription(e.target.value)}
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
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!selectedResourceId ? (
                            <div className="flex flex-col items-center justify-center h-32 text-center">
                                <Zap className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-muted-foreground text-sm">
                                    Select resource to view actions
                                </p>
                            </div>
                        ) : actions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-center">
                                <Zap className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-muted-foreground text-sm">No actions yet</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Key</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {actions.map((action) => (
                                        <TableRow key={action.id}>
                                            <TableCell className="font-medium">{action.name}</TableCell>
                                            <TableCell>
                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                    {action.key}
                                                </code>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() => setDeleteActionId(action.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Delete Resource Dialog */}
            <AlertDialog open={!!deleteResourceId} onOpenChange={() => setDeleteResourceId(null)}>
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
                            onClick={handleDeleteResource}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Action Dialog */}
            <AlertDialog open={!!deleteActionId} onOpenChange={() => setDeleteActionId(null)}>
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
                            onClick={handleDeleteAction}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
