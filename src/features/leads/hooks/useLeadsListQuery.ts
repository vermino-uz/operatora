"use client";

import { useQuery } from "@tanstack/react-query";

import { leadsApi } from "@/services/api/leads";
import { normalizePaginated } from "@/services/api/pagination";
import type { LeadFilters, LeadRow } from "@/features/leads/types";

export const LEADS_LIST_PAGE_SIZE = 25;

/** Active tab's List (table) view — the whole board, paginated, across
 * every column, distinct from the Kanban view's per-column
 * `useColumnLeadsQuery`. See `leadsApi.getLeadsList`'s doc comment for the
 * traced `GET /leads-list` contract (1-indexed page, `{data,count}`, which
 * `normalizePaginated()` already understands natively). */
export function leadsListQueryKey(boardId: string | null, page: number, filters?: LeadFilters) {
  return ["leads-list", boardId, page, filters] as const;
}

export function useLeadsListQuery(boardId: string | null, page: number, filters?: LeadFilters) {
  return useQuery({
    queryKey: leadsListQueryKey(boardId, page, filters),
    queryFn: async () => {
      const raw = await leadsApi.getLeadsList(boardId as string, { page, pageSize: LEADS_LIST_PAGE_SIZE }, filters);
      return normalizePaginated<LeadRow>(raw, { page, pageSize: LEADS_LIST_PAGE_SIZE });
    },
    enabled: Boolean(boardId),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}
