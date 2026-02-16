"use strict";

import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    limit: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    limitOptions?: number[];
    className?: string;
    disableNext?: boolean;
    disablePrevious?: boolean;
}

const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100];
const MAX_VISIBLE_PAGES = 7;

type PaginationToken = number | "left-ellipsis" | "right-ellipsis";

const getPaginationTokens = (
    currentPage: number,
    totalPages: number
): PaginationToken[] => {
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

export function PaginationControls({
    currentPage,
    totalPages,
    limit,
    totalCount,
    onPageChange,
    onLimitChange,
    limitOptions = DEFAULT_LIMIT_OPTIONS,
    className,
    disableNext,
    disablePrevious,
}: PaginationControlsProps) {
    const paginationTokens = getPaginationTokens(currentPage, totalPages);

    const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
    const pageEnd = totalCount === 0 ? 0 : Math.min(currentPage * limit, totalCount);
    const hasMultiplePages = totalPages > 1;

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                {/* Mobile: Simple Prev/Next + Page Info */}
                <div className="flex w-full items-center justify-between gap-2 md:hidden">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={disablePrevious || currentPage <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                        <span className="text-xs text-muted-foreground">{totalCount} total results</span>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={disableNext || currentPage >= totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Desktop: Limit Selector + Count info */}
                <div className="hidden flex-1 items-center gap-2 md:flex">
                    <p className="text-sm font-medium text-muted-foreground">
                        Showing {pageStart}-{pageEnd} of {totalCount}
                    </p>
                    <div className="flex items-center gap-2 ml-4">
                        <p className="text-sm font-medium text-muted-foreground">Rows per page</p>
                        <Select
                            value={String(limit)}
                            onValueChange={(value) => onLimitChange(Number(value))}
                        >
                            <SelectTrigger className="h-8 w-[70px]" aria-label="Rows per page">
                                <SelectValue placeholder={String(limit)} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {limitOptions.map((option) => (
                                    <SelectItem key={option} value={String(option)}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>


                {/* Desktop: Standard Pagination */}
                <div className="hidden md:block">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    className="hidden h-8 w-8 p-0 lg:flex"
                                    onClick={() => onPageChange(1)}
                                    disabled={disablePrevious || currentPage === 1}
                                >
                                    <span className="sr-only">Go to first page</span>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                            </PaginationItem>
                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => onPageChange(currentPage - 1)}
                                    disabled={disablePrevious || currentPage === 1}
                                >
                                    <span className="sr-only">Go to previous page</span>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </PaginationItem>

                            {paginationTokens.map((token, index) => (
                                <PaginationItem key={index}>
                                    {typeof token === "number" ? (
                                        <Button
                                            variant={token === currentPage ? "default" : "outline"}
                                            className="h-8 w-8 p-0"
                                            onClick={() => onPageChange(token)}
                                        >
                                            {token}
                                        </Button>
                                    ) : (
                                        <PaginationEllipsis />
                                    )}
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => onPageChange(currentPage + 1)}
                                    disabled={disableNext || currentPage === totalPages}
                                >
                                    <span className="sr-only">Go to next page</span>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </PaginationItem>
                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    className="hidden h-8 w-8 p-0 lg:flex"
                                    onClick={() => onPageChange(totalPages)}
                                    disabled={disableNext || currentPage === totalPages}
                                >
                                    <span className="sr-only">Go to last page</span>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>

            {/* Mobile Limit Selector (Optional/Bottom) */}
            <div className="flex w-full items-center justify-end gap-2 md:hidden">
                <span className="text-xs text-muted-foreground">Rows per page</span>
                <Select
                    value={String(limit)}
                    onValueChange={(value) => onLimitChange(Number(value))}
                >
                    <SelectTrigger className="h-8 w-[70px]" aria-label="Rows per page">
                        <SelectValue placeholder={String(limit)} />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {limitOptions.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
