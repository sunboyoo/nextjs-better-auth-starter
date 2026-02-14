"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";

interface CreateOrganizationDialogProps {
    onSuccess?: () => void;
}

export function CreateOrganizationDialog({ onSuccess }: CreateOrganizationDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [logo, setLogo] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    };

    const handleNameChange = (value: string) => {
        setName(value);
        const generated = generateSlug(value);
        setSlug(generated);
        if (generated) {
            checkSlug(generated);
        } else {
            setSlugStatus("idle");
        }
    };

    const handleSlugChange = (value: string) => {
        const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
        setSlug(cleaned);
        if (cleaned) {
            checkSlug(cleaned);
        } else {
            setSlugStatus("idle");
        }
    };

    const checkSlug = async (slugToCheck: string) => {
        setSlugStatus("checking");
        try {
            const { data } = await authClient.organization.checkSlug({
                slug: slugToCheck,
            });
            setSlugStatus(data?.status === true ? "available" : "taken");
        } catch {
            setSlugStatus("idle");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !slug.trim()) return;

        setIsLoading(true);
        try {
            const { data, error } = await authClient.organization.create({
                name: name.trim(),
                slug: slug.trim(),
                ...(logo.trim() ? { logo: logo.trim() } : {}),
            });

            if (error) {
                toast.error(error.message || "Failed to create organization");
                return;
            }

            toast.success(`Organization "${data?.name}" created successfully`);
            setOpen(false);
            resetForm();
            onSuccess?.();
        } catch {
            toast.error("Failed to create organization");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setSlug("");
        setLogo("");
        setSlugStatus("idle");
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Organization
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create Organization</DialogTitle>
                        <DialogDescription>
                            Create a new organization to collaborate with your team.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="org-name">Name</Label>
                            <Input
                                id="org-name"
                                placeholder="My Organization"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="org-slug">Slug</Label>
                            <div className="relative">
                                <Input
                                    id="org-slug"
                                    placeholder="my-organization"
                                    value={slug}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                    disabled={isLoading}
                                />
                                {slugStatus === "checking" && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                        Checking...
                                    </span>
                                )}
                                {slugStatus === "available" && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600">
                                        ✓ Available
                                    </span>
                                )}
                                {slugStatus === "taken" && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-600">
                                        ✗ Taken
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="org-logo">Logo URL (optional)</Label>
                            <Input
                                id="org-logo"
                                placeholder="https://example.com/logo.png"
                                value={logo}
                                onChange={(e) => setLogo(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => { setOpen(false); resetForm(); }}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !name.trim() || !slug.trim() || slugStatus === "taken"}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
