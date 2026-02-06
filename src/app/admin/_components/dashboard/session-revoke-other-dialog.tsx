"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { authClient } from "@/lib/auth-client";

interface SessionRevokeOtherDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function SessionRevokeOtherDialog({
    isOpen,
    onClose,
    onSuccess,
}: SessionRevokeOtherDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleRevokeOther = async () => {
        try {
            setIsLoading(true);
            await authClient.revokeOtherSessions();
            toast.success("All other sessions have been revoked");
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error revoking other sessions:", error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Failed to revoke other sessions");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleRevokeOther}
            title="Sign Out From Other Devices"
            description="This will sign you out from all other devices. You will remain signed in on this device only."
            confirmText={isLoading ? "Signing out..." : "Sign Out From Other Devices"}
            confirmVariant="default"
        />
    );
}
