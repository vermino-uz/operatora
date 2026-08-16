"use client";

import { useQuery } from "@tanstack/react-query";

import { leadStatsApi } from "@/services/api/leads";

export function useLeadStatsQuery(leadId: string, workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-stats", leadId],
    queryFn: () => leadStatsApi.get(leadId, workspaceId as string),
    enabled: enabled && Boolean(leadId) && Boolean(workspaceId),
  });
}
