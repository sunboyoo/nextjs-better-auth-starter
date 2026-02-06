"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import { Building2, FileJson, Pencil, Save, Settings2 } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { JsonEditor } from "json-edit-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { OrganizationEditDialog } from "./organization-edit-dialog";

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: string;
    metadata: string | null;
    memberCount: number;
    roleCount?: number;
}

interface OrganizationProfileTabProps {
    organizationId: string;
}

export function OrganizationProfileTab({ organizationId }: OrganizationProfileTabProps) {
    const queryClient = useQueryClient();
    const [brokenLogo, setBrokenLogo] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [editedMetadata, setEditedMetadata] = useState<any>({});
    const [isSavingMetadata, setIsSavingMetadata] = useState(false);

    const organizationUrl = `/api/admin/organizations/${organizationId}`;
    const { data, error, isLoading } = useQuery({
        queryKey: adminKeys.organization(organizationUrl),
        queryFn: () => fetcher(organizationUrl),
        refetchOnWindowFocus: false,
    });

    const saveMetadataMutation = useMutation({
        mutationFn: async (metadata: unknown) =>
            fetch(`/api/admin/organizations/${organizationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ metadata }),
            }),
    });

    const cloneJson = (value: any) => JSON.parse(JSON.stringify(value ?? {}));

    const org: Organization | null = data?.organization ?? null;

    const parsedMetadata = (() => {
        if (!org?.metadata) return {};
        try {
            return JSON.parse(org.metadata);
        } catch {
            return {};
        }
    })();

    useEffect(() => {
        if (org?.metadata) {
            try {
                setEditedMetadata(JSON.parse(org.metadata));
            } catch {
                setEditedMetadata({});
            }
        } else {
            setEditedMetadata({});
        }
    }, [org?.metadata]);

    const handleSaveMetadata = async () => {
        setIsSavingMetadata(true);
        try {
            const response = await saveMetadataMutation.mutateAsync(editedMetadata);

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || "Failed to update metadata");
            }

            await queryClient.invalidateQueries({
                queryKey: adminKeys.organization(organizationUrl),
            });
            setIsEditingMetadata(false);
        } catch (error) {
            console.error("Failed to save metadata:", error);
            alert("Failed to save metadata");
        } finally {
            setIsSavingMetadata(false);
        }
    };

    if (error) {
        return (
            <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex items-center justify-center py-8">
                    <p className="text-destructive">Failed to load organization profile</p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading || !org) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[150px]" />
                        <Skeleton className="h-4 w-[250px]" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const showLogo = Boolean(org.logo) && !brokenLogo;
    const handleOrganizationProfileSuccess = () => {
        void queryClient.invalidateQueries({
            queryKey: adminKeys.organization(organizationUrl),
        });
    };

    return (
        <div className="space-y-6">
            {/* Basic Information */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Basic Information
                        </CardTitle>
                        <CardDescription>Organization details and settings</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setIsEditDialogOpen(true)}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Name</Label>
                            <p className="font-medium">{org.name}</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Slug</Label>
                            <p className="font-mono text-sm bg-muted/50 px-2 py-1 rounded w-fit">{org.slug}</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Created At</Label>
                            <p className="text-sm">{format(new Date(org.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Logo</Label>
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden relative">
                                    {showLogo ? (
                                        <Image
                                            src={org.logo ?? ""}
                                            alt={org.name}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                            onError={() => setBrokenLogo(true)}
                                        />
                                    ) : (
                                        <Building2 className="h-6 w-6 text-muted-foreground/50" />
                                    )}
                                </div>
                                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {org.logo || "No logo set"}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            {isEditingMetadata ? <Settings2 className="h-5 w-5" /> : <FileJson className="h-5 w-5" />}
                            Metadata
                        </CardTitle>
                        <CardDescription>
                            {isEditingMetadata
                                ? "Modify the JSON object below. Make sure the format is valid before saving."
                                : "Custom metadata associated with this organization"}
                        </CardDescription>
                    </div>
                    {isEditingMetadata ? (
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsEditingMetadata(false);
                                    setEditedMetadata(cloneJson(parsedMetadata));
                                }}
                                disabled={isSavingMetadata}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveMetadata}
                                disabled={isSavingMetadata}
                                className="gap-2"
                            >
                                {isSavingMetadata ? "Saving..." : (
                                    <>
                                        <Save className="h-3.5 w-3.5" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsEditingMetadata(true)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md bg-zinc-50/50 dark:bg-zinc-900/50 p-4 min-h-[200px]">
                        <JsonEditor
                            data={(isEditingMetadata ? editedMetadata : parsedMetadata) ?? {}}
                            setData={isEditingMetadata ? setEditedMetadata : undefined}
                            viewOnly={!isEditingMetadata}
                        />
                    </div>
                </CardContent>
            </Card>

            <OrganizationEditDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onSuccess={handleOrganizationProfileSuccess}
                organization={org}
            />
        </div>
    );
}
