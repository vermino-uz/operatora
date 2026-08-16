"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { instagramApi } from "@/services/api/instagram";

const ACCOUNTS_KEY = (workspaceId: string | null) => ["instagram-accounts", workspaceId] as const;

export function useInstagramAccountsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ACCOUNTS_KEY(workspaceId),
    queryFn: () => instagramApi.getAccounts(),
    enabled: !!workspaceId,
  });
}

export function useInstagramAccountsInvalidate(workspaceId: string | null) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY(workspaceId) });
}

export function useResubscribeInstagramMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => instagramApi.resubscribe(accountId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY(workspaceId) }),
  });
}

export function useDisconnectInstagramMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, deleteConversations }: { accountId: string; deleteConversations: boolean }) =>
      instagramApi.disconnect(accountId, deleteConversations),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY(workspaceId) }),
  });
}
