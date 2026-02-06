"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { setUserPassword } from "@/utils/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { UserWithDetails } from "@/utils/users";

interface UserPasswordDialogProps {
  user: UserWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export function UserPasswordDialog({
  user,
  isOpen,
  onClose,
}: UserPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleSetPassword = async () => {
    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      await setUserPassword(user.id, newPassword);
      toast.success(`Password updated for ${user.name || user.email}.`);
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
      onConfirm={handleSetPassword}
      title={`Set password: ${user.name || user.email}`}
      description="Set a new password for this user. They can sign in with the new password immediately."
      confirmText={isLoading ? "Updating..." : "Set password"}
      confirmDisabled={!passwordsMatch || isLoading}
    >
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter a new password"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter the new password"
            required
          />
          {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          ) : null}
        </div>
      </div>
    </ConfirmationDialog>
  );
}
