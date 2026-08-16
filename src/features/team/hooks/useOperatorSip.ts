"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sipApi } from "@/services/api/sip";
import type { UpsertOperatorSipInput } from "@/features/team/types";

function sipQueryKey(workspaceId: string | null, userId: string | null) {
  return ["operator-sip", workspaceId, userId] as const;
}

export function useOperatorSipQuery(workspaceId: string | null, userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: sipQueryKey(workspaceId, userId),
    queryFn: () => sipApi.list(workspaceId as string, userId as string),
    enabled: enabled && !!workspaceId && !!userId,
    staleTime: 15_000,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string | null, userId: string | null) {
  queryClient.invalidateQueries({ queryKey: sipQueryKey(workspaceId, userId) });
  queryClient.invalidateQueries({ queryKey: ["workspace-operators", workspaceId] });
  // Keeps the "SIP Configuration" settings section's per-member counts in
  // sync — it reads the same accounts via a separate roster endpoint.
  queryClient.invalidateQueries({ queryKey: ["workspace-telephony-sip", workspaceId] });
}

export function useUpsertOperatorSipMutation(workspaceId: string | null, userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertOperatorSipInput) => {
      if (!workspaceId || !userId) throw new Error("No workspace/member selected");
      return sipApi.upsert(workspaceId, userId, input);
    },
    onSuccess: () => invalidate(queryClient, workspaceId, userId),
  });
}

export function useActivateOperatorSipMutation(workspaceId: string | null, userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sipId: string) => {
      if (!workspaceId || !userId) throw new Error("No workspace/member selected");
      return sipApi.activate(workspaceId, userId, sipId);
    },
    onSuccess: () => invalidate(queryClient, workspaceId, userId),
  });
}

export function useDeleteOperatorSipMutation(workspaceId: string | null, userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sipId: string) => {
      if (!workspaceId || !userId) throw new Error("No workspace/member selected");
      return sipApi.remove(workspaceId, userId, sipId);
    },
    onSuccess: () => invalidate(queryClient, workspaceId, userId),
  });
}
