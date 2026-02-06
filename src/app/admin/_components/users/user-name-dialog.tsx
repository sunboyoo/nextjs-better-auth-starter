"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { updateUserName } from "@/utils/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { UserWithDetails } from "@/utils/users";

interface UserNameDialogProps {
  user: UserWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export function UserNameDialog({
  user,
  isOpen,
  onClose,
}: UserNameDialogProps) {
  const [name, setName] = useState(user.name || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user.name || "");
      setIsLoading(false);
    }
  }, [isOpen, user.name]);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const existingName = useMemo(() => (user.name || "").trim(), [user.name]);
  const isUnchanged = trimmedName === existingName;
  const isInvalid = trimmedName.length === 0;

  const handleUpdateName = async () => {
    if (isInvalid) {
      toast.error("Name cannot be empty.");
      return;
    }
    if (isUnchanged) {
      toast.error("No changes to save.");
      return;
    }

    try {
      setIsLoading(true);
      await updateUserName(user.id, trimmedName);
      toast.success(`Name updated for ${user.name || user.email}.`);
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
      onConfirm={handleUpdateName}
      title={`Update name: ${user.name || user.email}`}
      description="Edit the user's display name."
      confirmText={isLoading ? "Saving..." : "Update name"}
      confirmDisabled={isInvalid || isUnchanged || isLoading}
    >
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="user-name">Name</Label>
          <Input
            id="user-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter user's name"
            autoComplete="name"
            required
          />
          {isInvalid ? (
            <p className="text-xs text-destructive">
              Name is required to save changes.
            </p>
          ) : null}
        </div>
      </div>
    </ConfirmationDialog>
  );
}
