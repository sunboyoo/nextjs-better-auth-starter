"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => res.json());

// Helper to check if a string is a UUID
const isUUID = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Helper to check if a string looks like a nanoid/cuid (organization IDs)
const isNanoId = (str: string) =>
    /^[a-zA-Z0-9_-]{10,30}$/.test(str) &&
    !/^(apps|resources|actions|organizations|roles|members|users|rbac)$/i.test(
        str
    );

export function SiteHeader() {
    const pathname = usePathname();
    const pathSegments = pathname.split("/").filter((segment) => segment);

    const relevantSegments =
        pathSegments[0] === "admin" ? pathSegments.slice(1) : pathSegments;

    // Extract appId and resourceId from path if present
    // Pattern: apps/[appId]/resources/[resourceId]/actions
    const appsIndex = relevantSegments.indexOf("apps");
    const appId =
        appsIndex !== -1 &&
            relevantSegments[appsIndex + 1] &&
            isUUID(relevantSegments[appsIndex + 1])
            ? relevantSegments[appsIndex + 1]
            : null;

    const resourcesIndex = relevantSegments.indexOf("resources");
    const resourceId =
        resourcesIndex !== -1 &&
            relevantSegments[resourcesIndex + 1] &&
            isUUID(relevantSegments[resourcesIndex + 1])
            ? relevantSegments[resourcesIndex + 1]
            : null;

    // Extract organizationId from path if present
    // Pattern: organizations/[organizationId]/roles
    const organizationsIndex = relevantSegments.indexOf("organizations");
    const organizationId =
        organizationsIndex !== -1 &&
            relevantSegments[organizationsIndex + 1] &&
            isNanoId(relevantSegments[organizationsIndex + 1])
            ? relevantSegments[organizationsIndex + 1]
            : null;

    // Fetch app name if appId is present
    const appUrl = appId ? `/api/admin/apps/${appId}` : null;
    const { data: appData } = useQuery({
        queryKey: adminKeys.app(appUrl),
        queryFn: () => fetcher(appUrl!),
        enabled: Boolean(appUrl),
        refetchOnWindowFocus: false,
    });

    // Fetch resource name if resourceId is present
    const resourcesUrl = resourceId && appId ? `/api/admin/apps/${appId}/resources` : null;
    const { data: resourceData } = useQuery({
        queryKey: adminKeys.appResources(resourcesUrl),
        queryFn: () => fetcher(resourcesUrl!),
        enabled: Boolean(resourcesUrl),
        refetchOnWindowFocus: false,
    });

    const appName = appData?.app?.name;
    const resourceName = resourceData?.resources?.find(
        (r: { id: string }) => r.id === resourceId
    )?.name;

    // Fetch organization name if organizationId is present
    const organizationUrl = organizationId
        ? `/api/admin/organizations/${organizationId}`
        : null;
    const { data: orgData } = useQuery({
        queryKey: adminKeys.organization(organizationUrl),
        queryFn: () => fetcher(organizationUrl!),
        enabled: Boolean(organizationUrl),
        refetchOnWindowFocus: false,
    });
    const orgName = orgData?.organization?.name;

    // Create a map of ID to name
    const nameMap: Record<string, string> = {};
    if (appId && appName) nameMap[appId] = appName;
    if (resourceId && resourceName) nameMap[resourceId] = resourceName;
    if (organizationId && orgName) nameMap[organizationId] = orgName;

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/admin">Admin</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {relevantSegments.length > 0 && <BreadcrumbSeparator />}
                        {relevantSegments.map((segment, index) => {
                            const href = `/admin/${relevantSegments
                                .slice(0, index + 1)
                                .join("/")}`;
                            const isLast = index === relevantSegments.length - 1;
                            // Use name from map if available, otherwise capitalize segment
                            const displayName = nameMap[segment] || segment;
                            return (
                                <React.Fragment key={href}>
                                    <BreadcrumbItem>
                                        {isLast ? (
                                            <BreadcrumbPage className="capitalize">
                                                {displayName}
                                            </BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink asChild className="capitalize">
                                                <Link href={href}>{displayName}</Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && <BreadcrumbSeparator />}
                                </React.Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </header>
    );
}
