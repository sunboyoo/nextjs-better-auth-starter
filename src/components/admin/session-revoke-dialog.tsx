"use client";

import { useState } from "react";
import toast from "react-hot-toast";
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
    const [isLoading, setIsLoading] = useState(false);

    const handleRevoke = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `/api/admin/sessions/${encodeURIComponent(session.token)}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to revoke session");
            }

            toast.success("Session revoked successfully");
            onSuccess?.();
            onClose();
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleRevoke}
            title="Revoke Session"
            description={`This will terminate the session for ${session.user.name || session.user.email}. They will be logged out from this device and need to sign in again.`}
            confirmText={isLoading ? "Revoking..." : "Revoke Session"}
            confirmVariant="destructive"
        />
    );
}
