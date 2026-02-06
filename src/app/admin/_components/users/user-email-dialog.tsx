import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  triggerUserEmailChangeVerification,
  updateUserEmailAndMarkUnverified,
  updateUserEmailAndMarkVerified,
} from "@/utils/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { UserWithDetails } from "@/utils/users";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail } from "lucide-react";

interface UserEmailDialogProps {
  user: UserWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type UpdateMode =
  | "verification"
  | "direct-unverified"
  | "direct-verified";

export function UserEmailDialog({
  user,
  isOpen,
  onClose,
}: UserEmailDialogProps) {
  const [newEmail, setNewEmail] = useState("");
  const [mode, setMode] = useState<UpdateMode>("verification");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewEmail("");
      setMode("verification");
      setIsLoading(false);
    }
  }, [isOpen, user.email]);

  const normalizedEmail = useMemo(
    () => newEmail.trim().toLowerCase(),
    [newEmail],
  );
  const existingEmail = useMemo(
    () => (user.email || "").trim().toLowerCase(),
    [user.email],
  );
  const isUnchanged = normalizedEmail === existingEmail;
  const isInvalid =
    normalizedEmail.length === 0 || !EMAIL_REGEX.test(normalizedEmail);

  const handleUpdateEmail = async () => {
    if (isInvalid) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (isUnchanged) {
      toast.error("No changes to save.");
      return;
    }

    try {
      setIsLoading(true);
      if (mode === "verification") {
        const changeResult = await triggerUserEmailChangeVerification(
          user.id,
          normalizedEmail,
          "/dashboard",
        );
        toast.success(
          "Email change requested. The user must confirm via the current email and verify the new email.",
        );
        if (changeResult?.emailMismatch) {
          toast(
            "Info: you triggered a change for another user. The confirmation will go to their current email.",
          );
        }
      } else if (mode === "direct-verified") {
        await updateUserEmailAndMarkVerified(user.id, normalizedEmail);
        toast.success("Email updated and marked verified.");
      } else {
        await updateUserEmailAndMarkUnverified(user.id, normalizedEmail);
        toast.success("Email updated. Email marked unverified.");
      }
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
      onConfirm={handleUpdateEmail}
      title="Change Email"
      description="Update the email address on a user's account."
      confirmText={isLoading ? "Saving..." : "Request email change"}
      confirmDisabled={isInvalid || isUnchanged || isLoading}
    >
      <div className="grid gap-6 py-4">
        <Card className="flex flex-row items-center gap-4 border p-4 shadow-sm bg-muted/40">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </Card>

        <div className="grid gap-2">
          <Label>Current email</Label>
          <p className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">
            {user.email || "No email on file"}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="new-email">New email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
              className="pl-9"
            />
          </div>
          {isInvalid ? (
            <p className="text-xs text-destructive">
              A valid new email is required to save changes.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <Label>Change option</Label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input px-3 py-2 text-sm transition hover:bg-muted/40">
            <input
              type="radio"
              name="email-update-mode"
              value="verification"
              checked={mode === "verification"}
              onChange={() => setMode("verification")}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span className="flex flex-col gap-1">
              <span className="font-medium">
                Trigger normal email verification process
              </span>
              <span className="text-xs text-muted-foreground">
                Sends a confirmation link to the current email and a verification
                link to the new email. The email updates after both.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input px-3 py-2 text-sm transition hover:bg-muted/40">
            <input
              type="radio"
              name="email-update-mode"
              value="direct-unverified"
              checked={mode === "direct-unverified"}
              onChange={() => setMode("direct-unverified")}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span className="flex flex-col gap-1">
              <span className="font-medium">
                Skip verification, update now and mark unverified
              </span>
              <span className="text-xs text-muted-foreground">
                Updates the database immediately. User must verify the new email
                before password sign-in.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input px-3 py-2 text-sm transition hover:bg-muted/40">
            <input
              type="radio"
              name="email-update-mode"
              value="direct-verified"
              checked={mode === "direct-verified"}
              onChange={() => setMode("direct-verified")}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span className="flex flex-col gap-1">
              <span className="font-medium">
                Skip verification, update now and mark verified
              </span>
              <span className="text-xs text-muted-foreground">
                Updates the database immediately and marks the new email as
                verified.
              </span>
            </span>
          </label>
        </div>
      </div>
    </ConfirmationDialog>
  );
}
