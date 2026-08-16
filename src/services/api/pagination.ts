import type { Paginated } from "@/types/api";

/**
 * The old API returns list data in at least three different shapes
 * (see ARCHITECTURE.md "Pagination/Filtering/Sorting"):
 *   - `{ data, count }`               (e.g. /api/leads-list)
 *   - `{ leads, totalCount, page, perPage }` (e.g. /api/lead-board/:id/leads)
 *   - bare array, no envelope         (e.g. /api/get-board-pagination)
 *
 * Every list-fetching hook should run its raw response through this
 * adapter so the shared `DataTable` component only ever sees one shape.
 * Pass the specific item-array key(s) an endpoint uses; unknown/missing
 * fields fall back sensibly instead of throwing.
 */
export function normalizePaginated<T>(
  raw: unknown,
  opts: {
    itemsKey?: string;
    totalKey?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Paginated<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
      total: raw.length,
      page: opts.page ?? 1,
      pageSize: opts.pageSize ?? raw.length,
    };
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const itemsKey = opts.itemsKey ?? (Array.isArray(obj.data) ? "data" : Array.isArray(obj.leads) ? "leads" : "items");
    const items = (Array.isArray(obj[itemsKey]) ? obj[itemsKey] : []) as T[];
    const totalKey = opts.totalKey ?? (typeof obj.count === "number" ? "count" : typeof obj.totalCount === "number" ? "totalCount" : "total");
    const total = typeof obj[totalKey] === "number" ? (obj[totalKey] as number) : items.length;
    const page = typeof obj.page === "number" ? obj.page : opts.page ?? 1;
    const pageSize =
      typeof obj.perPage === "number"
        ? obj.perPage
        : typeof obj.pageSize === "number"
          ? obj.pageSize
          : (opts.pageSize ?? items.length);

    return { items, total, page, pageSize };
  }

  return { items: [], total: 0, page: opts.page ?? 1, pageSize: opts.pageSize ?? 0 };
}
