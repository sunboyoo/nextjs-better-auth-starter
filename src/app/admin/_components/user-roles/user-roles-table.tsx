"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Shield, User, Users } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import { UserRolePermissionTreeDisplay } from "./user-role-permission-tree-display";
import { BUILT_IN_USER_ROLES } from "@/lib/built-in-user-role-permissions";

type UserRole = typeof BUILT_IN_USER_ROLES[number];

export function UserRolesTable() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Filters state, initialized from URL
    const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "all");
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const limit = Number(searchParams.get("limit")) || 10;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Update URL when filters/page change
    useEffect(() => {
        const params = new URLSearchParams();
        if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
        if (debouncedSearch) params.set("search", debouncedSearch);
        params.set("page", String(page));
        params.set("limit", String(limit));
        router.replace(`?${params.toString()}`);
    }, [roleFilter, debouncedSearch, page, limit, router]);

    // Filter and search roles
    const filteredRoles = useMemo(() => {
        let roles = [...BUILT_IN_USER_ROLES] as UserRole[];

        // Filter by role type
        if (roleFilter && roleFilter !== "all") {
            roles = roles.filter((r) => r.role === roleFilter);
        }

        // Search by name or description
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            roles = roles.filter(
                (r) =>
                    r.role.toLowerCase().includes(query) ||
                    r.description.toLowerCase().includes(query)
            );
        }

        return roles;
    }, [roleFilter, debouncedSearch]);

    // Pagination
    const total = filteredRoles.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedRoles = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredRoles.slice(start, start + limit);
    }, [filteredRoles, page, limit]);

    // Filter controls
    const filterControls = (
        <div className="flex flex-wrap gap-2 items-end mb-2 w-full justify-between">
            <div className="flex gap-2 items-end">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search roles..."
                        className="pl-8 pr-2 py-2 border rounded-md text-sm bg-background w-[200px]"
                        value={searchQuery}
                        onChange={(e) => {
                            const nextValue = e.target.value;
                            setSearchQuery(nextValue);
                            if (page !== 1) setPage(1);
                        }}
                    />
                </div>
                {/* Role select filter */}
                <Select
                    value={roleFilter}
                    onValueChange={(v) => {
                        setRoleFilter(v);
                        if (page !== 1) setPage(1);
                    }}
                >
                    <SelectTrigger className="w-[140px] flex items-center gap-2">
                        <span className="flex items-center gap-2">
                            {roleFilter === "all" ? (
                                <Users className="w-4 h-4" />
                            ) : roleFilter === "admin" ? (
                                <Shield className="w-4 h-4" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                            {roleFilter === "all"
                                ? "All roles"
                                : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">
                            <span className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                All roles
                            </span>
                        </SelectItem>
                        <SelectItem value="admin">
                            <span className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Admin
                            </span>
                        </SelectItem>
                        <SelectItem value="user">
                            <span className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                User
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    // Pagination component
    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const pageNumbers = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, page + 2);
        if (endPage - startPage < maxPagesToShow - 1) {
            if (startPage === 1) {
                endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }
        }
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        return (
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            aria-disabled={page === 1}
                            tabIndex={page === 1 ? -1 : 0}
                            className={page === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>
                    {startPage > 1 && (
                        <>
                            <PaginationItem>
                                <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
                            </PaginationItem>
                            {startPage > 2 && <PaginationEllipsis />}
                        </>
                    )}
                    {pageNumbers.map((pNum) => (
                        <PaginationItem key={pNum}>
                            <PaginationLink
                                isActive={pNum === page}
                                onClick={() => setPage(pNum)}
                            >
                                {pNum}
                            </PaginationLink>
                        </PaginationItem>
                    ))}
                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && <PaginationEllipsis />}
                            <PaginationItem>
                                <PaginationLink onClick={() => setPage(totalPages)}>
                                    {totalPages}
                                </PaginationLink>
                            </PaginationItem>
                        </>
                    )}
                    <PaginationItem>
                        <PaginationNext
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            aria-disabled={page === totalPages}
                            tabIndex={page === totalPages ? -1 : 0}
                            className={
                                page === totalPages ? "pointer-events-none opacity-50" : ""
                            }
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        );
    };

    return (
        <div className="space-y-4">
            {filterControls}
            <div className="overflow-hidden rounded-lg border-muted border-2">
                <Table className="text-sm">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                Role
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                Description
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                Permissions
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-medium text-muted-foreground w-[100px]">
                                Type
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRoles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No roles found
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRoles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell className="px-4 py-3">
                                        <Badge
                                            variant="outline"
                                            className={`flex items-center gap-1 px-2 py-1 text-xs w-fit ${role.role === "admin"
                                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700"
                                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700"
                                                }`}
                                        >
                                            {role.role === "admin" ? (
                                                <Shield className="h-3 w-3" />
                                            ) : (
                                                <User className="h-3 w-3" />
                                            )}
                                            {role.role.charAt(0).toUpperCase() + role.role.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-muted-foreground max-w-[300px]">
                                        {role.description}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <UserRolePermissionTreeDisplay
                                            permissions={role.permissions as Record<string, string[]>}
                                        />
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        {role.isBuiltIn && (
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                Built-in
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between px-4 py-1">
                <div className="text-sm text-muted-foreground">
                    Showing {paginatedRoles.length} of {total} roles
                </div>
                {renderPagination()}
            </div>
        </div>
    );
}
