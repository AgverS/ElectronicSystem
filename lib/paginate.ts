export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit = 25,
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(5, parseInt(searchParams.get("limit") ?? String(defaultLimit), 10) || defaultLimit),
  );
  return { page, limit, skip: (page - 1) * limit };
}

export interface PaginationMeta {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export function paginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    page,
    limit,
  };
}
