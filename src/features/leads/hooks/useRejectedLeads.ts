"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rejectedLeadsApi } from "@/services/api/leads";
import { normalizePaginated } from "@/services/api/pagination";
import { invalidateAllLeadViews } from "@/features/leads/hooks/invalidateAllLeadViews";
import type { LeadFilters, LeadRow } from "@/features/leads/types";

export const REJECTED_PAGE_SIZE = 100;

export function rejectedLeadsQueryKey(boardId: string | null, page: number, filters?: LeadFilters) {
  return ["rejected-leads", boardId, page, filters] as const;
}

/** Rejected tab — see `rejectedLeadsApi`'s doc comment for the traced
 * contract (0-indexed page, fixed 100/page, `{leads,count}`). */
export function useRejectedLeadsQuery(boardId: string | null, page: number, filters?: LeadFilters) {
  return useQuery({
    queryKey: rejectedLeadsQueryKey(boardId, page, filters),
    queryFn: async () => {
      const raw = await rejectedLeadsApi.list(boardId as string, page, filters);
      return normalizePaginated<LeadRow>(raw, { page, pageSize: REJECTED_PAGE_SIZE });
    },
    enabled: Boolean(boardId),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useRestoreRejectedLeadMutation(boardId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => rejectedLeadsApi.restore(leadId),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}
