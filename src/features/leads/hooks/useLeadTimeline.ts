"use client";

import { useQuery } from "@tanstack/react-query";

import { leadLifecycleEventsApi } from "@/services/api/leadLifecycleEvents";

export function useLeadTimelineQuery(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-timeline", leadId],
    queryFn: () => leadLifecycleEventsApi.list(leadId),
    enabled: enabled && Boolean(leadId),
  });
}
