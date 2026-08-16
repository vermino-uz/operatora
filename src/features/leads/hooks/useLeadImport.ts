"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { leadsImportApi } from "@/services/api/leadsExportImport";
import { invalidateAllLeadViews } from "@/features/leads/hooks/invalidateAllLeadViews";

/** `GET /leads-import/sample` — one-shot download, mutation not query (same
 * "user-triggered action, not cached state" reasoning as `useLeadExportMutation`). */
export function useLeadImportSampleMutation() {
  return useMutation({
    mutationFn: (workspaceId?: string) => leadsImportApi.getSample(workspaceId),
  });
}

/** `POST /leads-import/bulk` — real bulk-create; invalidates every Active-tab
 * board view (board/list) plus board data (counts) since a successful import
 * can both add leads and create new pipeline columns (`columnsCreated`, see
 * `LeadsBulkImportResult`), mirroring `invalidateAllLeadViews`'s existing
 * usage after other lead-mutating bulk actions in this feature. */
export function useLeadBulkImportMutation(boardId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { file: File; columnId?: string; workspaceId?: string; operatorId?: string }) =>
      leadsImportApi.bulkImport({ ...params, boardId: boardId as string }),
    onSuccess: () => {
      invalidateAllLeadViews(queryClient, boardId);
      queryClient.invalidateQueries({ queryKey: ["add-lead-columns", boardId] });
    },
  });
}
