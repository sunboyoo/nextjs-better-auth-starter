"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrganizationPermissionTreeSelector } from "@/components/shared/organization-permission-tree-selector";
import { statements } from "@/lib/built-in-organization-role-permissions";

const RESOURCE_LABELS: Record<string, string> = {
    organization: "Organization",
    member: "Member",
    invitation: "Invitation",
    team: "Team",
    ac: "Access Control",
};

interface OrganizationRoleAddDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    organizationId: string;
}

export function OrganizationRoleAddDialog({
    isOpen,
    onClose,
    onSuccess,
    organizationId,
}: OrganizationRoleAddDialogProps) {
    const [name, setName] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});
    const [error, setError] = useState<string | null>(null);

    const createRoleMutation = useMutation({
        mutationFn: async (payload: { role: string; permission: string }) => {
            const response = await fetch(`/api/admin/organizations/${organizationId}/roles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to create role");
            }
            return response.json();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Filter out empty permission arrays
        const filteredPermissions: Record<string, string[]> = {};
        Object.entries(selectedPermissions).forEach(([key, value]) => {
            if (value.length > 0) {
                filteredPermissions[key] = value;
            }
        });

        try {
            await createRoleMutation.mutateAsync({
                role: name,
                permission: JSON.stringify(filteredPermissions),
            });
            setName("");
            setSelectedPermissions({});
            onSuccess();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create role");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Create organization role
                    </DialogTitle>
                    <DialogDescription>
                        Create organization role with specific permissions for this organization.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Organization Role Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Editor, Viewer"
                                required
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label>Permissions</Label>
                            <OrganizationPermissionTreeSelector
                                availablePermissions={statements}
                                selectedPermissions={selectedPermissions}
                                onChange={setSelectedPermissions}
                                resourceLabels={RESOURCE_LABELS}
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createRoleMutation.isPending || !name}>
                            {createRoleMutation.isPending ? "Creating..." : "Create organization role"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
