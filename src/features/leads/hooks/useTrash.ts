"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trashApi } from "@/services/api/leads";
import { invalidateAllLeadViews } from "@/features/leads/hooks/invalidateAllLeadViews";

export function trashQueryKey(workspaceId: string | null) {
  return ["leads-trash", workspaceId] as const;
}

/** Trash tab — workspace-scoped (a soft-deleted lead can be from any
 * board), see `trashApi`'s doc comment for the traced contract. */
export function useTrashQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: trashQueryKey(workspaceId),
    queryFn: () => trashApi.list(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 10_000,
  });
}

export function useRestoreTrashLeadMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => trashApi.restore(leadId, workspaceId as string),
    // Restoring out of Trash could land the lead back on any board — no
    // single `boardId` to scope invalidation to, so invalidate every
    // board-scoped list too (see `invalidateAllLeadViews`'s `!boardId`
    // "match everything" branch).
    onSuccess: () => invalidateAllLeadViews(queryClient, null),
  });
}

export function usePermanentlyDeleteLeadMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => trashApi.permanentlyDelete(leadId, workspaceId as string),
    onSuccess: () => invalidateAllLeadViews(queryClient, null),
  });
}
