"use client";

import { Building2, Users, Shield, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import Image from "next/image";
import { useState, useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: string | null;
    metadata: string | null;
    memberCount: number;
    roleCount?: number;
}

interface OrganizationResponse {
    organization?: Organization;
    error?: string;
}

interface OrganizationInfoCardProps {
    organizationId: string;
}

const fetcher = async (url: string): Promise<OrganizationResponse> => {
    const response = await fetch(url, { credentials: "include" });
    const payload = (await response.json().catch(() => null)) as OrganizationResponse | null;

    if (!response.ok) {
        throw new Error(payload?.error || "Failed to load organization information");
    }

    return payload ?? {};
};

export function OrganizationInfoCard({ organizationId }: OrganizationInfoCardProps) {
    const [brokenLogo, setBrokenLogo] = useState(false);

    const organizationUrl = `/api/admin/organizations/${organizationId}`;
    const { data, error, isLoading } = useQuery({
        queryKey: adminKeys.organization(organizationUrl),
        queryFn: () => fetcher(organizationUrl),
        refetchOnWindowFocus: false,
    });

    const handleLogoError = useCallback(() => {
        setBrokenLogo(true);
    }, []);

    if (error) {
        return (
            <div className="py-8 text-center">
                <p className="text-destructive">Failed to load organization information</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-start gap-5 pb-6">
                <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
            </div>
        );
    }

    const organization: Organization | null = data?.organization ?? null;
    if (!organization) {
        return (
            <div className="py-8 text-center">
                <p className="text-destructive">Organization data is unavailable</p>
            </div>
        );
    }

    const showLogo = Boolean(organization.logo) && !brokenLogo;
    const createdAt = organization.createdAt ? new Date(organization.createdAt) : null;
    const createdAtLabel =
        createdAt && !Number.isNaN(createdAt.getTime())
            ? format(createdAt, "MMM d, yyyy")
            : "Unknown date";

    return (
        <div className="flex items-start gap-5 pb-6">
            {/* Logo */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground overflow-hidden relative">
                {showLogo ? (
                    <Image
                        src={organization.logo ?? ""}
                        alt={organization.name}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={handleLogoError}
                    />
                ) : (
                    <Building2 className="h-8 w-8" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight truncate">
                    {organization.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                        {organization.slug}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {organization.memberCount} members
                    </span>
                    {typeof organization.roleCount === 'number' && (
                        <span className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            {organization.roleCount} roles
                        </span>
                    )}
                    <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Created {createdAtLabel}
                    </span>
                </div>
            </div>
        </div>
    );
}
