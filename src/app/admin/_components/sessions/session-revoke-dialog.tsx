"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { SessionWithUser } from "@/utils/sessions-client";

interface SessionRevokeDialogProps {
    session: SessionWithUser;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function SessionRevokeDialog({
    session,
    isOpen,
    onClose,
    onSuccess,
}: SessionRevokeDialogProps) {
    const revokeSessionMutation = useMutation({
        mutationFn: async (token: string) => {
            const response = await fetch(
                `/api/admin/sessions/${encodeURIComponent(token)}`,
                { method: "DELETE", credentials: "include" }
            );
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to revoke session");
            }
        },
    });

    const handleRevoke = async () => {
        try {
            await revokeSessionMutation.mutateAsync(session.token);
            toast.success("Session revoked successfully");
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
            onConfirm={handleRevoke}
            title="Revoke Session"
            description={`This will terminate the session for ${session.user.name || session.user.email}. They will be logged out from this device and need to sign in again.`}
            confirmText={revokeSessionMutation.isPending ? "Revoking..." : "Revoke Session"}
            confirmVariant="destructive"
        />
    );
}
