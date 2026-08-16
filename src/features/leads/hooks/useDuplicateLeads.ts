"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { duplicateLeadsApi } from "@/services/api/duplicateLeads";
import { invalidateAllLeadViews } from "@/features/leads/hooks/invalidateAllLeadViews";

/** `GET /duplicated-leads?boardId=` — only fires while the dialog is open
 * (`enabled`), matching every other on-demand dialog query in this feature
 * (e.g. `useFilteredBulkPreviewQuery`). No polling — duplicate detection is
 * a point-in-time scan the user re-triggers by reopening/refetching, not a
 * live view. */
export function useDuplicateLeadsQuery(boardId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["duplicate-leads", boardId],
    queryFn: () => duplicateLeadsApi.list(boardId),
    enabled: enabled && Boolean(boardId),
  });
}

/** Both mutations invalidate the full board-scoped view set (a delete/merge
 * can remove leads from whatever column/tab they were sitting in) plus this
 * dialog's own scan query, so the group list and every underlying leads
 * view stay in sync without a manual refetch. */
export function useDeleteDuplicateLeadsMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadIds: string[]) => duplicateLeadsApi.removeMany(leadIds),
    onSuccess: () => {
      invalidateAllLeadViews(queryClient, boardId);
      queryClient.invalidateQueries({ queryKey: ["duplicate-leads", boardId] });
    },
  });
}

export function useMergeDuplicateLeadsMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ primaryLeadId, duplicateLeadIds }: { primaryLeadId: string; duplicateLeadIds: string[] }) =>
      duplicateLeadsApi.merge(primaryLeadId, duplicateLeadIds),
    onSuccess: () => {
      invalidateAllLeadViews(queryClient, boardId);
      queryClient.invalidateQueries({ queryKey: ["duplicate-leads", boardId] });
    },
  });
}
