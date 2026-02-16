"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Building2, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { OrganizationCard } from "./_components/organization-card";
import { CreateOrganizationDialog } from "./_components/create-organization-dialog";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const LIMIT_OPTIONS = [10, 20, 50, 100];
const MAX_VISIBLE_PAGES = 7;

type PaginationToken = number | "left-ellipsis" | "right-ellipsis";

const parsePositiveInteger = (value: string | null, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return parsed;
};

const getPaginationTokens = (currentPage: number, totalPages: number): PaginationToken[] => {
    if (totalPages <= MAX_VISIBLE_PAGES) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    const tokens: PaginationToken[] = [1];

    if (start > 2) {
        tokens.push("left-ellipsis");
    }

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        tokens.push(pageNumber);
    }

    if (end < totalPages - 1) {
        tokens.push("right-ellipsis");
    }

    tokens.push(totalPages);
    return tokens;
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
    const totalOrganizations = organizations?.length ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalOrganizations / limit));
    const currentPage = Math.min(page, totalPages);
    const paginationTokens = useMemo(
        () => getPaginationTokens(currentPage, totalPages),
        [currentPage, totalPages],
    );

    useEffect(() => {
        if (currentPage === page) return;
        updatePaginationInUrl(currentPage, limit);
    }, [currentPage, limit, page, updatePaginationInUrl]);

    const paginatedOrganizations = useMemo(() => {
        if (!organizations || organizations.length === 0) return [];
        const startIndex = (currentPage - 1) * limit;
        return organizations.slice(startIndex, startIndex + limit);
    }, [currentPage, limit, organizations]);

    const pageStart = totalOrganizations === 0 ? 0 : (currentPage - 1) * limit + 1;
    const pageEnd = totalOrganizations === 0 ? 0 : Math.min(currentPage * limit, totalOrganizations);
    const hasMultiplePages = totalPages > 1;
    const canGoPrevious = currentPage > DEFAULT_PAGE;
    const canGoNext = currentPage < totalPages;
    const buildPaginationHref = useCallback(
        (nextPage: number, nextLimit: number = limit) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(nextPage));
            params.set("limit", String(nextLimit));
            return `${pathname}?${params.toString()}`;
        },
        [limit, pathname, searchParams],
    );

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
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm">
                                <Badge variant="outline" className="font-medium">
                                    {hasMultiplePages ? `Page ${currentPage} of ${totalPages}` : "Single page"}
                                </Badge>
                                <Badge variant="secondary" className="hidden font-medium sm:inline-flex">
                                    {hasMultiplePages
                                        ? `Showing ${pageStart}-${pageEnd} of ${totalOrganizations}`
                                        : `${totalOrganizations} organizations`}
                                </Badge>
                                <Badge variant="secondary" className="font-medium sm:hidden">
                                    {hasMultiplePages
                                        ? `${pageStart}-${pageEnd}/${totalOrganizations}`
                                        : `${totalOrganizations} total`}
                                </Badge>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground md:text-sm">
                                        Per page
                                    </span>
                                    <Select
                                        value={String(limit)}
                                        onValueChange={(value) =>
                                            updatePaginationInUrl(
                                                DEFAULT_PAGE,
                                                Math.min(parsePositiveInteger(value, DEFAULT_LIMIT), MAX_LIMIT),
                                            )
                                        }
                                    >
                                        <SelectTrigger className="h-8 w-20 rounded-lg text-xs sm:text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LIMIT_OPTIONS.map((option) => (
                                                <SelectItem key={option} value={String(option)}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Pagination className="justify-center">
                                <PaginationContent>
                                    <PaginationItem className="hidden sm:block">
                                        <PaginationLink
                                            href={buildPaginationHref(DEFAULT_PAGE, limit)}
                                            aria-label="Go to first page"
                                            aria-disabled={!canGoPrevious}
                                            className={!canGoPrevious ? "pointer-events-none opacity-50" : undefined}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                if (!canGoPrevious) return;
                                                updatePaginationInUrl(DEFAULT_PAGE, limit);
                                            }}
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </PaginationLink>
                                    </PaginationItem>

                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={buildPaginationHref(Math.max(DEFAULT_PAGE, currentPage - 1), limit)}
                                            aria-disabled={!canGoPrevious}
                                            className={!canGoPrevious ? "pointer-events-none opacity-50" : undefined}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                if (!canGoPrevious) return;
                                                updatePaginationInUrl(currentPage - 1, limit);
                                            }}
                                        />
                                    </PaginationItem>

                                    {paginationTokens.map((token) =>
                                        typeof token === "number" ? (
                                            <PaginationItem
                                                key={token}
                                                className={token === currentPage ? undefined : "hidden sm:block"}
                                            >
                                                <PaginationLink
                                                    href={buildPaginationHref(token, limit)}
                                                    isActive={token === currentPage}
                                                    className={token === currentPage ? "shadow-xs" : undefined}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        if (token === currentPage) return;
                                                        updatePaginationInUrl(token, limit);
                                                    }}
                                                >
                                                    {token}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ) : (
                                            <PaginationItem key={token} className="hidden sm:block">
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        ),
                                    )}

                                    <PaginationItem>
                                        <PaginationNext
                                            href={buildPaginationHref(Math.min(totalPages, currentPage + 1), limit)}
                                            aria-disabled={!canGoNext}
                                            className={!canGoNext ? "pointer-events-none opacity-50" : undefined}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                if (!canGoNext) return;
                                                updatePaginationInUrl(currentPage + 1, limit);
                                            }}
                                        />
                                    </PaginationItem>

                                    <PaginationItem className="hidden sm:block">
                                        <PaginationLink
                                            href={buildPaginationHref(totalPages, limit)}
                                            aria-label="Go to last page"
                                            aria-disabled={!canGoNext}
                                            className={!canGoNext ? "pointer-events-none opacity-50" : undefined}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                if (!canGoNext) return;
                                                updatePaginationInUrl(totalPages, limit);
                                            }}
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </PaginationLink>
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
