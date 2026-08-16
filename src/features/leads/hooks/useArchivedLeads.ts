"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { archivedLeadsApi } from "@/services/api/leads";
import { normalizePaginated } from "@/services/api/pagination";
import { invalidateAllLeadViews } from "@/features/leads/hooks/invalidateAllLeadViews";
import type { LeadFilters, LeadRow } from "@/features/leads/types";

export const ARCHIVED_PAGE_SIZE = 100;

export function archivedLeadsQueryKey(boardId: string | null, page: number, filters?: LeadFilters) {
  return ["archived-leads", boardId, page, filters] as const;
}

/** Archived tab — see `archivedLeadsApi`'s doc comment for the traced
 * contract (0-indexed page, fixed 100/page, `{leads,count}`). Only
 * single-lead restore is wired here; bulk restore/archive is Phase 2c-3. */
export function useArchivedLeadsQuery(boardId: string | null, page: number, filters?: LeadFilters) {
  return useQuery({
    queryKey: archivedLeadsQueryKey(boardId, page, filters),
    queryFn: async () => {
      const raw = await archivedLeadsApi.list(boardId as string, page, filters);
      return normalizePaginated<LeadRow>(raw, { page, pageSize: ARCHIVED_PAGE_SIZE });
    },
    enabled: Boolean(boardId),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useRestoreArchivedLeadMutation(boardId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => archivedLeadsApi.restore(leadId),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}

/** `PATCH /archived-leads-list/restore-multiple` — real bulk endpoint, wired
 * for the Archived tab's row-selection "Restore selected" action
 * (Phase 2c-3). */
export function useBulkRestoreArchivedLeadsMutation(boardId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadIds: string[]) => archivedLeadsApi.restoreMultiple(leadIds),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}
