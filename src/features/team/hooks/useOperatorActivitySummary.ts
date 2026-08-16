"use client";

import { useQuery } from "@tanstack/react-query";

import { activityApi } from "@/services/api/activity";

/**
 * Today's per-operator "actively working" time — same view-role gate as
 * presence. Polled every 60s while visible (matches old frontend), not a
 * push subscription — the backend has no realtime event for this.
 */
export function useOperatorActivitySummary(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["operator-activity-summary", workspaceId],
    queryFn: () => activityApi.summary(workspaceId as string),
    enabled: enabled && !!workspaceId,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
  });
}
