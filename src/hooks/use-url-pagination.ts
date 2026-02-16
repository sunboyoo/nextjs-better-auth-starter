"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "@/lib/constants";

interface UseUrlPaginationOptions {
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
    isDataReady?: boolean;
}

const parsePositiveInteger = (value: string | null, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return parsed;
};

export function useUrlPagination<T>(
    items: T[] | undefined,
    options: UseUrlPaginationOptions = {},
) {
    const {
        defaultPage = 1,
        defaultLimit = DEFAULT_PAGE_LIMIT,
        maxLimit = MAX_PAGE_LIMIT,
        isDataReady,
    } = options;

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");
    const page = parsePositiveInteger(rawPage, defaultPage);
    const limit = Math.min(parsePositiveInteger(rawLimit, defaultLimit), maxLimit);

    const buildPaginationParams = useCallback(
        (nextPage: number, nextLimit: number = limit) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(nextPage));
            params.set("limit", String(nextLimit));
            return params;
        },
        [limit, searchParams],
    );

    const setPagination = useCallback(
        (nextPage: number, nextLimit: number = limit) => {
            const params = buildPaginationParams(nextPage, nextLimit);
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [buildPaginationParams, limit, pathname, router],
    );

    useEffect(() => {
        if (rawPage === String(page) && rawLimit === String(limit)) return;
        setPagination(page, limit);
    }, [limit, page, rawLimit, rawPage, setPagination]);

    const dataReady = isDataReady ?? typeof items !== "undefined";
    const totalCount = items?.length ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const currentPage = dataReady ? Math.min(page, totalPages) : page;

    useEffect(() => {
        if (!dataReady) return;
        if (currentPage === page) return;
        setPagination(currentPage, limit);
    }, [currentPage, dataReady, limit, page, setPagination]);

    const paginatedItems = useMemo(() => {
        if (!items || items.length === 0) return [];
        const startIndex = (currentPage - 1) * limit;
        return items.slice(startIndex, startIndex + limit);
    }, [currentPage, items, limit]);

    const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
    const pageEnd = totalCount === 0 ? 0 : Math.min(currentPage * limit, totalCount);

    const onPageChange = useCallback(
        (nextPage: number) => {
            setPagination(Math.max(defaultPage, nextPage), limit);
        },
        [defaultPage, limit, setPagination],
    );

    const onLimitChange = useCallback(
        (nextLimit: number) => {
            const sanitizedLimit = Math.min(Math.max(1, nextLimit), maxLimit);
            setPagination(defaultPage, sanitizedLimit);
        },
        [defaultPage, maxLimit, setPagination],
    );

    return {
        page,
        limit,
        totalCount,
        totalPages,
        currentPage,
        pageStart,
        pageEnd,
        paginatedItems,
        onPageChange,
        onLimitChange,
        setPagination,
    };
}
