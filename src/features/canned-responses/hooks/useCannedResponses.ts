"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cannedResponsesApi } from "@/services/api/cannedResponses";
import type { CannedResponseInput } from "@/features/canned-responses/types";

function queryKey(workspaceId: string | null) {
  return ["canned-responses", workspaceId ?? "none"] as const;
}

export function useCannedResponsesQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: queryKey(workspaceId),
    queryFn: () => cannedResponsesApi.list(),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateCannedResponseMutation(workspaceId: string | null, userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, nextDisplayOrder }: { input: CannedResponseInput; nextDisplayOrder: number }) =>
      cannedResponsesApi.create(input, nextDisplayOrder, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(workspaceId) }),
  });
}

export function useUpdateCannedResponseMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CannedResponseInput }) => cannedResponsesApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(workspaceId) }),
  });
}

export function useDeleteCannedResponseMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cannedResponsesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(workspaceId) }),
  });
}
