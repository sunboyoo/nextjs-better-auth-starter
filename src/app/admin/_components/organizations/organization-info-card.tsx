"use client";

import { Building2, Users, Shield, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import Image from "next/image";
import { useState, useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";

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

interface OrganizationInfoCardProps {
    organizationId: string;
}

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

    if (isLoading || !data) {
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

    const org: Organization = data.organization;
    const showLogo = Boolean(org.logo) && !brokenLogo;

    return (
        <div className="flex items-start gap-5 pb-6">
            {/* Logo */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground overflow-hidden relative">
                {showLogo ? (
                    <Image
                        src={org.logo ?? ""}
                        alt={org.name}
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
                    {org.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                        {org.slug}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {org.memberCount} members
                    </span>
                    {typeof org.roleCount === 'number' && (
                        <span className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            {org.roleCount} roles
                        </span>
                    )}
                    <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Created {format(new Date(org.createdAt), "MMM d, yyyy")}
                    </span>
                </div>
            </div>
        </div>
    );
}
