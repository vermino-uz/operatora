"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadsApi, soldLeadsApi } from "@/services/api/leads";
import { invalidateAllLeadViews } from "@/features/leads/hooks/invalidateAllLeadViews";

export function soldLeadsQueryKey(boardId: string | null) {
  return ["sold-leads", boardId] as const;
}

/** Sold tab — see `soldLeadsApi`'s doc comment for the traced contract
 * (no pagination/filters on this endpoint). */
export function useSoldLeadsQuery(boardId: string | null) {
  return useQuery({
    queryKey: soldLeadsQueryKey(boardId),
    queryFn: () => soldLeadsApi.list(boardId as string),
    enabled: Boolean(boardId),
    staleTime: 10_000,
  });
}

export function useRestoreSoldLeadMutation(boardId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => soldLeadsApi.restore(leadId),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}

/** Soft-delete (to Trash) — reuses the same `DELETE /leads/:id` every other
 * "delete a lead" action in this app would use; gated to admin/manager
 * roles in the caller (backend re-enforces regardless). */
export function useDeleteLeadMutation(boardId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => leadsApi.deleteLead(leadId),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}
