"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Layers, Plus, Trash2, MoreHorizontal, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

interface Team {
    id: string;
    name: string;
    organizationId: string;
    createdAt: Date;
    updatedAt?: Date;
}

export default function TeamsPage() {
    const params = useParams<{ organizationId: string }>();
    const organizationId = params.organizationId;

    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [teamName, setTeamName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTeams = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await authClient.organization.listTeams({
                query: { organizationId },
            });
            if (error) {
                toast.error("Failed to load teams");
                return;
            }
            const raw = data as unknown;
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as Record<string, unknown>)?.teams)
                    ? (raw as Record<string, unknown>).teams as unknown[]
                    : [];
            setTeams(list as Team[]);
        } catch {
            toast.error("Failed to load teams");
        } finally {
            setIsLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim()) return;

        setIsCreating(true);
        try {
            const { error } = await authClient.organization.createTeam({
                name: teamName.trim(),
                organizationId,
            });
            if (error) {
                toast.error(error.message || "Failed to create team");
                return;
            }
            toast.success(`Team "${teamName}" created`);
            setCreateOpen(false);
            setTeamName("");
            fetchTeams();
        } catch {
            toast.error("Failed to create team");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setIsDeleting(true);
        try {
            const { error } = await authClient.organization.removeTeam({
                teamId: deleteConfirm.id,
                organizationId,
            });
            if (error) {
                toast.error(error.message || "Failed to delete team");
                return;
            }
            toast.success("Team deleted");
            setDeleteConfirm(null);
            fetchTeams();
        } catch {
            toast.error("Failed to delete team");
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Teams ({teams.length})</h2>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Team
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px]">
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create Team</DialogTitle>
                                <DialogDescription>
                                    Create a new team within this organization.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="team-name">Team Name</Label>
                                    <Input
                                        id="team-name"
                                        placeholder="Engineering"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        disabled={isCreating}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setCreateOpen(false); setTeamName(""); }}
                                    disabled={isCreating}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isCreating || !teamName.trim()}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Teams Grid */}
            {teams.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <Layers className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">No teams yet</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Create teams to organize members within your organization.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => (
                        <Card key={team.id} className="group">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-sm truncate">{team.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Created {format(new Date(team.createdAt), "MMM d, yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => setDeleteConfirm({ id: team.id, name: team.name })}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Team
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete team <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
