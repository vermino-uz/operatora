import { leadsApi } from "@/services/api/leads";
import { normalizePaginated } from "@/services/api/pagination";
import type { LeadFilters, LeadRow } from "@/features/leads/types";

const FETCH_PAGE_SIZE = 100;

/** Load every lead id in a kanban column (respecting filters), paginating
 * through the same endpoint the column cards use. Backend caps pageSize at
 * 100 — we walk pages until `totalCount` is exhausted. */
export async function fetchAllColumnLeadIds(
  boardId: string,
  columnId: string,
  filters?: LeadFilters,
  totalHint?: number,
): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let total = totalHint ?? Number.POSITIVE_INFINITY;

  while (ids.length < total) {
    const raw = await leadsApi.getColumnLeads(boardId, columnId, { page, pageSize: FETCH_PAGE_SIZE }, filters);
    const normalized = normalizePaginated<LeadRow>(raw, {
      itemsKey: "leads",
      totalKey: "totalCount",
      page,
      pageSize: FETCH_PAGE_SIZE,
    });
    total = normalized.total;
    for (const lead of normalized.items) ids.push(lead.id);
    if (normalized.items.length === 0 || ids.length >= total) break;
    page += 1;
  }

  return ids;
}
