"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadsListBulkApi, type FilteredBulkExecuteParams, type FilteredBulkParams } from "@/services/api/leads";
import { invalidateAllLeadViews } from "@/features/leads/hooks/invalidateAllLeadViews";

/**
 * Filtered ("act on every lead matching the current filters") bulk actions —
 * see `leadsListBulkApi`'s doc comment for the traced `bulk/preview`/
 * `bulk/execute` contract. Active tab only (the base query these endpoints
 * apply to is scoped to non-archived/sold/rejected/deleted leads).
 */
export function useFilteredBulkPreviewQuery(params: FilteredBulkParams, enabled: boolean) {
  return useQuery({
    queryKey: ["leads-bulk-preview", params.boardId, params.filters, params.selectedColumns],
    queryFn: () => leadsListBulkApi.preview(params),
    enabled: enabled && Boolean(params.boardId),
    // Short staleTime, not zero — the dialog's own filter bar is already
    // debounced upstream (`LeadFiltersBar`), so this doesn't need its own
    // extra debounce layer, just avoids refiring on every re-render while
    // the dialog stays open with unchanged filters.
    staleTime: 5_000,
  });
}

/** No optimistic patch — a filtered bulk action can affect thousands of
 * leads across every column/page at once, so a full invalidation is the
 * only correct outcome here (mirrors `useBulkMoveColumnMutation` etc.'s
 * same reasoning for the row-selection variants). */
export function useFilteredBulkExecuteMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: FilteredBulkExecuteParams) => leadsListBulkApi.execute(params),
    onSuccess: () => {
      invalidateAllLeadViews(queryClient, boardId);
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "leads-bulk-preview" });
    },
  });
}
