"use client";

import { useState, useEffect } from "react";
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
import { Plus, Loader2, ImageIcon, ImageOff } from "lucide-react";
import { generateSlugFromName } from "@/lib/utils";

interface CreateOrganizationDialogProps {
    onSuccess?: () => void;
}

export function CreateOrganizationDialog({ onSuccess }: CreateOrganizationDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [logo, setLogo] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const [logoPreviewStatus, setLogoPreviewStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
    const [debouncedLogo, setDebouncedLogo] = useState("");

    useEffect(() => {
        if (!logo.trim()) {
            setDebouncedLogo("");
            setLogoPreviewStatus("idle");
            return;
        }
        setLogoPreviewStatus("loading");
        const timer = setTimeout(() => {
            setDebouncedLogo(logo.trim());
        }, 500);
        return () => clearTimeout(timer);
    }, [logo]);

    const handleNameChange = (value: string) => {
        setName(value);
        if (!isSlugManuallyEdited) {
            const generated = generateSlugFromName(value);
            setSlug(generated);
            if (generated) {
                checkSlug(generated);
            } else {
                setSlugStatus("idle");
            }
        }
    };

    const handleSlugChange = (value: string) => {
        const cleaned = generateSlugFromName(value);
        setSlug(cleaned);
        setIsSlugManuallyEdited(cleaned.length > 0);
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
        setIsSlugManuallyEdited(false);
        setLogo("");
        setSlugStatus("idle");
        setLogoPreviewStatus("idle");
        setDebouncedLogo("");
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
                            <Label htmlFor="organization-name">Name</Label>
                            <Input
                                id="organization-name"
                                placeholder="My Organization"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="organization-slug">Slug</Label>
                            <div className="relative">
                                <Input
                                    id="organization-slug"
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
                            <Label htmlFor="organization-logo">Logo URL (optional)</Label>
                            <Input
                                id="organization-logo"
                                placeholder="https://example.com/logo.png"
                                value={logo}
                                onChange={(e) => setLogo(e.target.value)}
                                disabled={isLoading}
                            />
                            {logo.trim() && (
                                <div className="flex items-center gap-3 rounded-md border p-3">
                                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                                        {logoPreviewStatus === "loading" && (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        )}
                                        {logoPreviewStatus === "error" && (
                                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        {debouncedLogo && logoPreviewStatus !== "error" && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={debouncedLogo}
                                                alt="Logo preview"
                                                className="h-full w-full object-cover"
                                                onLoad={() => setLogoPreviewStatus("loaded")}
                                                onError={() => setLogoPreviewStatus("error")}
                                            />
                                        )}
                                        {logoPreviewStatus === "idle" && (
                                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {logoPreviewStatus === "loading" && (
                                            <p className="text-xs text-muted-foreground">Loading preview...</p>
                                        )}
                                        {logoPreviewStatus === "loaded" && (
                                            <p className="text-xs text-muted-foreground">Logo preview loaded</p>
                                        )}
                                        {logoPreviewStatus === "error" && (
                                            <p className="text-xs text-destructive">Unable to load image. Please check the URL.</p>
                                        )}
                                        {logoPreviewStatus === "idle" && (
                                            <p className="text-xs text-muted-foreground">Enter a URL to preview</p>
                                        )}
                                    </div>
                                </div>
                            )}
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
