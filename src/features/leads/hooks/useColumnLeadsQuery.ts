"use client";

import { useQuery } from "@tanstack/react-query";

import { leadsApi } from "@/services/api/leads";
import { normalizePaginated } from "@/services/api/pagination";
import type { LeadFilters, LeadRow } from "@/features/leads/types";

export const COLUMN_PAGE_SIZE = 25;

/** `filters` appended after `page` (not interleaved) so `useLeadMutations`'
 * optimistic-patch loop — which reads `key[2]` as columnId and `key[3]` as
 * page — keeps working unchanged across every filter variant. */
export function columnLeadsQueryKey(boardId: string | null, columnId: string, page: number, filters?: LeadFilters) {
  return ["column-leads", boardId, columnId, page, filters] as const;
}

/** One kanban column's cards, server-paginated (`{leads,totalCount,page,
 * perPage}` — run through the shared `normalizePaginated()` adapter, same
 * as every other paginated list in this app), filtered by `LeadFilters`
 * (search/marital+academic status/age range/date range/created-by/channel/
 * assigned operator — see that type's doc comment for the exact traced
 * param set and what's deliberately excluded). Numbered Prev/Next, matching
 * `ConversationsTable`'s established pagination UX rather than infinite
 * scroll. */
export function useColumnLeadsQuery(boardId: string | null, columnId: string, page: number, filters?: LeadFilters) {
  return useQuery({
    queryKey: columnLeadsQueryKey(boardId, columnId, page, filters),
    queryFn: async () => {
      const raw = await leadsApi.getColumnLeads(
        boardId as string,
        columnId,
        { page, pageSize: COLUMN_PAGE_SIZE },
        filters,
      );
      return normalizePaginated<LeadRow>(raw, { itemsKey: "leads", totalKey: "totalCount", page, pageSize: COLUMN_PAGE_SIZE });
    },
    enabled: Boolean(boardId) && Boolean(columnId),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}
