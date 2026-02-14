"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SessionRevokeAllDialogProps {
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    sessionCount: number;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function SessionRevokeAllDialog({
    user,
    sessionCount,
    isOpen,
    onClose,
    onSuccess,
}: SessionRevokeAllDialogProps) {
    const revokeAllMutation = useMutation({
        mutationFn: async (userId: string) => {
            const response = await fetch(
                `/api/admin/users/${encodeURIComponent(userId)}/sessions`,
                { method: "DELETE", credentials: "include" }
            );
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to revoke sessions");
            }
        },
    });

    const handleRevokeAll = async () => {
        try {
            await revokeAllMutation.mutateAsync(user.id);
            toast.success(`All sessions for ${user.name || user.email} have been revoked.`);
            onSuccess?.();
            onClose();
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            }
        }
    };

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleRevokeAll}
            title="Revoke All User Sessions"
            description={
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.image || undefined} alt={user.name} />
                            <AvatarFallback className="text-xs">
                                {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-sm text-muted-foreground">{user.email}</span>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        This will terminate all {sessionCount} active session{sessionCount !== 1 ? "s" : ""} for this user.
                        They will be logged out from all devices and need to sign in again.
                    </p>
                </div>
            }
            confirmText={revokeAllMutation.isPending ? "Revoking..." : `Revoke ${sessionCount} Session${sessionCount !== 1 ? "s" : ""}`}
            confirmVariant="destructive"
        />
    );
}
