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

interface OrganizationRoleEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    organizationId: string;
    role: {
        id: string;
        role: string;
        permission: string;
    } | null;
}

export function OrganizationRoleEditDialog({
    isOpen,
    onClose,
    onSuccess,
    organizationId,
    role,
}: OrganizationRoleEditDialogProps) {
    const [name, setName] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});
    const [error, setError] = useState<string | null>(null);

    // Sync form state when role prop changes (React render-time state adjustment)
    const [prevRole, setPrevRole] = useState(role);
    if (role !== prevRole) {
        setPrevRole(role);
        if (role) {
            setName(role.role);
            try {
                const parsed = JSON.parse(role.permission);
                setSelectedPermissions(parsed);
            } catch (e) {
                console.error("Failed to parse permissions", e);
                setSelectedPermissions({});
            }
        }
    }

    const updateRoleMutation = useMutation({
        mutationFn: async (payload: { roleId: string; role: string; permission: string }) => {
            const response = await fetch(`/api/admin/organizations/${organizationId}/roles/${payload.roleId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: payload.role, permission: payload.permission }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to update role");
            }
            return response.json();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!role) return;
        setError(null);

        // Filter out empty permission arrays
        const filteredPermissions: Record<string, string[]> = {};
        Object.entries(selectedPermissions).forEach(([key, value]) => {
            if (value.length > 0) {
                filteredPermissions[key] = value;
            }
        });

        try {
            await updateRoleMutation.mutateAsync({
                roleId: role.id,
                role: name,
                permission: JSON.stringify(filteredPermissions),
            });
            onSuccess();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update role");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Update organization role
                    </DialogTitle>
                    <DialogDescription>
                        Update permissions for this organization role.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-role-name">Organization role name</Label>
                            <Input
                                id="edit-role-name"
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
                        <Button type="submit" disabled={updateRoleMutation.isPending || !name}>
                            {updateRoleMutation.isPending ? "Updating..." : "Update"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
