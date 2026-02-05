import { NextRequest } from "next/server";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "@/lib/constants";

export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * 解析分页参数
 * @param request - Next.js 请求对象
 * @returns 分页参数对象
 */
export function parsePagination(request: NextRequest): PaginationParams {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = parseInt(searchParams.get("page") || "1");
    const rawLimit = parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_LIMIT));
    const page = Math.max(1, Number.isNaN(pageParam) ? 1 : pageParam);
    const limitValue = Number.isNaN(rawLimit) ? DEFAULT_PAGE_LIMIT : rawLimit;
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, limitValue));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

/**
 * 创建分页元数据
 * @param total - 总记录数
 * @param pagination - 分页参数
 * @returns 分页元数据对象
 */
export function createPaginationMeta(
    total: number,
    pagination: PaginationParams
): PaginationMeta {
    return {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
    };
}
