"use client";

import { useQuery } from "@tanstack/react-query";

import { leadsApi } from "@/services/api/leads";
import type { LeadFilters } from "@/features/leads/types";

/** `filters` deliberately excluded from the base key's required params
 * (defaults to `undefined`) so `useLeadMutations`' predicate-based
 * invalidation (`q.queryKey[0] === "lead-board" && q.queryKey[1] ===
 * boardId`) keeps matching every filter variant of this query without
 * needing to know the filters shape. */
export function leadBoardQueryKey(boardId: string | null, filters?: LeadFilters) {
  return ["lead-board", boardId, filters] as const;
}

/** Board columns + per-column counts, filtered by the same `LeadFilters`
 * the column-leads query uses (see that hook's doc comment) — counts
 * reflect the active filters, not the unfiltered total. Short `staleTime`
 * + no aggressive polling — realtime (`subscribeToLeadBoardUpdates`) is
 * what keeps this fresh on `lead_moved`/`lead_assigned`/`lead_deleted`,
 * this is just the initial/fallback fetch, matching the project's
 * flood-prevention rule. */
export function useLeadBoardQuery(boardId: string | null, filters?: LeadFilters) {
  return useQuery({
    queryKey: leadBoardQueryKey(boardId, filters),
    queryFn: () => leadsApi.getBoardData(boardId as string, filters),
    enabled: Boolean(boardId),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}
