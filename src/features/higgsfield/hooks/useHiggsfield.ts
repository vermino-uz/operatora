"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { higgsfieldApi } from "@/services/api/higgsfield";

export function higgsfieldStatusQueryKey(workspaceId: string | null) {
  return ["higgsfield-status", workspaceId] as const;
}

export function useHiggsfieldStatusQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: higgsfieldStatusQueryKey(workspaceId),
    queryFn: () => higgsfieldApi.status(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useHiggsfieldBalanceQuery(workspaceId: string | null, connected: boolean) {
  return useQuery({
    queryKey: ["higgsfield-balance", workspaceId],
    queryFn: () => higgsfieldApi.balance(workspaceId!),
    enabled: !!workspaceId && connected,
  });
}

export function useHiggsfieldConnectMutation(workspaceId: string | null) {
  return useMutation({
    mutationFn: (language: string) => higgsfieldApi.connect(workspaceId!, language),
  });
}

export function useHiggsfieldDisconnectMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => higgsfieldApi.disconnect(workspaceId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: higgsfieldStatusQueryKey(workspaceId) });
    },
  });
}
