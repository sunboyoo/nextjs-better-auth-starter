"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
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
import { generateSlugFromName } from "@/lib/utils";

interface OrganizationAddDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function OrganizationAddDialog({
    isOpen,
    onClose,
    onSuccess,
}: OrganizationAddDialogProps) {
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [logo, setLogo] = useState("");
    const [logoInvalid, setLogoInvalid] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createOrganizationMutation = useMutation({
        mutationFn: async (payload: { name: string; slug: string; logo?: string }) => {
            // Step 1: Check slug availability
            const slugCheckResponse = await fetch(
                `/api/admin/organizations/check-slug?slug=${encodeURIComponent(payload.slug)}`,
            );
            const slugCheckPayload = await slugCheckResponse.json();
            if (!slugCheckResponse.ok) {
                throw new Error(slugCheckPayload.error || "Failed to validate slug");
            }
            if (slugCheckPayload.available !== true) {
                throw new Error("Organization with this slug already exists");
            }

            // Step 2: Create organization
            const response = await fetch("/api/admin/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to create organization");
            }
            return response.json();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const finalSlug = slug || generateSlugFromName(name);
        const requestBody: { name: string; slug: string; logo?: string } = {
            name,
            slug: finalSlug,
        };
        const normalizedLogo = logo.trim();
        if (normalizedLogo.length > 0) {
            requestBody.logo = normalizedLogo;
        }

        try {
            await createOrganizationMutation.mutateAsync(requestBody);
            setName("");
            setSlug("");
            setIsSlugManuallyEdited(false);
            setLogo("");
            setLogoInvalid(false);
            onSuccess();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create organization");
        }
    };

    const handleNameChange = (value: string) => {
        setName(value);
        if (!isSlugManuallyEdited) {
            setSlug(generateSlugFromName(value));
        }
    };

    const handleSlugChange = (value: string) => {
        const normalized = generateSlugFromName(value);
        setSlug(normalized);
        setIsSlugManuallyEdited(normalized.length > 0);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Create organization
                    </DialogTitle>
                    <DialogDescription>
                        Create organization. Members can be added after creation.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Organization Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="My Organization"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">
                                    Slug <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                                </Label>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                    placeholder={name ? generateSlugFromName(name) : "my-organization"}
                                />
                            </div>
                        </div>
                        <div className="text-[0.8rem] text-muted-foreground -mt-2">
                            URL-friendly identifier. Auto-generated if left empty.
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="logo">Logo URL <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                            <div className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <Input
                                        id="logo"
                                        value={logo}
                                        onChange={(e) => {
                                            setLogo(e.target.value);
                                            if (logoInvalid) setLogoInvalid(false);
                                        }}
                                        placeholder="https://example.com/logo.png"
                                    />
                                    <p className="text-[0.8rem] text-muted-foreground mt-1.5">
                                        Enter direct URL to your organization&apos;s logo image.
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <div className="h-20 w-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden relative">
                                        {logo ? (
                                            logoInvalid ? (
                                                <span className="text-xs text-muted-foreground font-medium">Invalid</span>
                                            ) : (
                                                <Image
                                                    src={logo}
                                                    alt="Preview"
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                    onError={() => setLogoInvalid(true)}
                                                />
                                            )
                                        ) : (
                                            <Building2 className="h-8 w-8 text-muted-foreground/50" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createOrganizationMutation.isPending || !name}>
                            {createOrganizationMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
