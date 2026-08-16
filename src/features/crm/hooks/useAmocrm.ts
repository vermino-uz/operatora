"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { amocrmApi } from "@/services/api/crm";
import type { AmocrmStatus } from "@/features/crm/types";

const statusKey = ["amocrm-status"] as const;

/** Auto-polls while an import is running — mirrors the old frontend's
 * `refetchInterval` exactly (2s while `status === "importing"`). */
export function useAmocrmStatusQuery(enabled: boolean) {
  return useQuery({
    queryKey: statusKey,
    queryFn: () => amocrmApi.status(),
    enabled,
    refetchInterval: (query) => {
      const data = query.state.data as AmocrmStatus | undefined;
      return data?.status === "importing" ? 2000 : false;
    },
  });
}

export function useConnectAmocrmMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subdomain, accessToken }: { subdomain: string; accessToken: string }) =>
      amocrmApi.connect(subdomain, accessToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey }),
  });
}

export function useDisconnectAmocrmMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => amocrmApi.disconnect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey }),
  });
}

export function usePreviewAmocrmBoardsMutation() {
  return useMutation({ mutationFn: () => amocrmApi.previewBoards() });
}

export function usePreviewAmocrmOperatorsMutation() {
  return useMutation({ mutationFn: () => amocrmApi.previewOperators() });
}

export function useStartAmocrmImportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      operatorMapping?: Record<string, { action: "map" | "skip"; operatorId?: string }>;
      selectedStatusIds?: number[];
    }) => amocrmApi.startImport(input.operatorMapping, input.selectedStatusIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey }),
  });
}

export function useAmocrmPendingCredentialsMutation() {
  return useMutation({ mutationFn: () => amocrmApi.pendingOperatorCredentials() });
}
