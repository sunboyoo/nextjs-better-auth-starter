"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2, Plus } from "lucide-react";
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
    const [logo, setLogo] = useState("");
    const [logoInvalid, setLogoInvalid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/admin/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, slug: slug || generateSlug(name), logo: logo || null }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create organization");
            }

            setName("");
            setSlug("");
            setLogo("");
            setLogoInvalid(false);
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

    const handleNameChange = (value: string) => {
        setName(value);
        if (!slug) {
            // Auto-generate slug from name if user hasn't manually set it
        }
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder={name ? generateSlug(name) : "my-organization"}
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
                        <Button type="submit" disabled={isLoading || !name}>
                            {isLoading ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
