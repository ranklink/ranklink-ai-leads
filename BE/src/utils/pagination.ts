export function getPagination(page?: number, limit?: number) {
  const p = Math.max(1, page || 1);
  const l = Math.min(100, Math.max(1, limit || 25));
  const skip = (p - 1) * l;
  return { page: p, limit: l, skip, take: l };
}

export function buildPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
