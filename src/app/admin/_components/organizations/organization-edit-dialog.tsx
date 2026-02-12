"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
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

interface OrganizationEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    organization: {
        id: string;
        name: string;
        slug: string;
        logo: string | null;
    } | null;
}

export function OrganizationEditDialog({
    isOpen,
    onClose,
    onSuccess,
    organization,
}: OrganizationEditDialogProps) {
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [logo, setLogo] = useState("");
    const [logoInvalid, setLogoInvalid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (organization) {
            setName(organization.name);
            setSlug(organization.slug);
            setLogo(organization.logo || "");
            setLogoInvalid(false);
        }
    }, [organization]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;

        setIsLoading(true);
        setError(null);

        try {
            const finalSlug = slug || generateSlug(name);
            const slugCheckResponse = await fetch(
                `/api/admin/organizations/check-slug?slug=${encodeURIComponent(finalSlug)}&excludeOrganizationId=${encodeURIComponent(organization.id)}`,
            );
            const slugCheckPayload = await slugCheckResponse.json();
            if (!slugCheckResponse.ok) {
                throw new Error(slugCheckPayload.error || "Failed to validate slug");
            }
            if (slugCheckPayload.available !== true) {
                throw new Error("Organization with this slug already exists");
            }

            const response = await fetch(`/api/admin/organizations/${organization.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    slug: finalSlug,
                    logo: logo || null
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update organization");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Update organization
                    </DialogTitle>
                    <DialogDescription>
                        Update organization details.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Organization name</Label>
                                <Input
                                    id="edit-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My Organization"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-slug">
                                    Slug <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                                </Label>
                                <Input
                                    id="edit-slug"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder={name ? generateSlug(name) : "my-organization"}
                                />
                            </div>
                        </div>
                        <div className="text-[0.8rem] text-muted-foreground -mt-2">
                            URL-friendly identifier. Auto-generated if left empty.
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-logo">Logo URL <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                            <div className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <Input
                                        id="edit-logo"
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
                        <Button type="submit" disabled={isLoading || !name}>
                            {isLoading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
