"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadRejectionReasonsApi } from "@/services/api/leads";

/** `GET /lead-rejection-reasons?workspace_id=` — always resolves to a
 * non-empty array (server-side defaults, see `leadRejectionReasonsApi`'s
 * doc comment), `staleTime` matches Team Members' operator-picker pattern
 * (a slow-changing config list, not worth refetching on every dialog open). */
export function useLeadRejectionReasonsQuery(workspaceId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["lead-rejection-reasons", workspaceId],
    queryFn: () => leadRejectionReasonsApi.list(workspaceId as string),
    enabled: Boolean(workspaceId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** `PUT /lead-rejection-reasons` — replace-all shape (no per-item CRUD
 * endpoint exists), backs the minimal add/remove reason-list manager
 * embedded in `MarkRejectedDialog`. */
export function useSetLeadRejectionReasonsMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reasons: string[]) => leadRejectionReasonsApi.set(workspaceId, reasons),
    onSuccess: (data) => {
      queryClient.setQueryData(["lead-rejection-reasons", workspaceId], data);
    },
  });
}
