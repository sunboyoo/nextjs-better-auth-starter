"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Building2, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { OrganizationCard } from "./_components/organization-card";
import { CreateOrganizationDialog } from "./_components/create-organization-dialog";
import { PaginationControls } from "@/components/pagination-controls";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parsePositiveInteger = (value: string | null, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return parsed;
};

export default function OrganizationsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");
    const page = parsePositiveInteger(rawPage, DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInteger(rawLimit, DEFAULT_LIMIT), MAX_LIMIT);

    const updatePaginationInUrl = useCallback(
        (nextPage: number, nextLimit: number = limit) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(nextPage));
            params.set("limit", String(nextLimit));
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [limit, pathname, router, searchParams],
    );

    useEffect(() => {
        if (rawPage === String(page) && rawLimit === String(limit)) return;
        updatePaginationInUrl(page, limit);
    }, [limit, page, rawLimit, rawPage, updatePaginationInUrl]);

    const { data: organizations, isPending, error, refetch } = authClient.useListOrganizations();
    const hasOrganizationsData = typeof organizations !== "undefined";
    const totalOrganizations = organizations?.length ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalOrganizations / limit));
    const currentPage = hasOrganizationsData ? Math.min(page, totalPages) : page;

    useEffect(() => {
        if (!hasOrganizationsData) return;
        if (currentPage === page) return;
        updatePaginationInUrl(currentPage, limit);
    }, [currentPage, hasOrganizationsData, limit, page, updatePaginationInUrl]);

    const paginatedOrganizations = useMemo(() => {
        if (!organizations || organizations.length === 0) return [];
        const startIndex = (currentPage - 1) * limit;
        return organizations.slice(startIndex, startIndex + limit);
    }, [currentPage, limit, organizations]);

    return (
        <div className="w-full space-y-6">
            {/* Page Header */}
            <div className="rounded-xl border-0 shadow-none bg-card p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 shadow-sm dark:bg-violet-900/30 dark:text-violet-400">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight md:text-lg">
                                Organizations
                            </h1>
                            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                                Manage your organizations and collaborate with your teams.
                            </p>
                        </div>
                    </div>
                    <CreateOrganizationDialog onSuccess={() => refetch()} />
                </div>
            </div>

            {/* Content */}
            {isPending ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="rounded-xl border bg-card p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        Failed to load organizations. Please try again.
                    </p>
                </div>
            ) : !organizations || organizations.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <Building2 className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">No organizations yet</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Create your first organization to get started.
                            </p>
                        </div>
                        <div className="mt-2">
                            <CreateOrganizationDialog onSuccess={() => refetch()} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {paginatedOrganizations.map((organization) => (
                            <OrganizationCard key={organization.id} organization={organization} />
                        ))}
                    </div>

                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            limit={limit}
                            totalCount={totalOrganizations}
                            onPageChange={(p) => updatePaginationInUrl(p, limit)}
                            onLimitChange={(l) => updatePaginationInUrl(1, l)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
