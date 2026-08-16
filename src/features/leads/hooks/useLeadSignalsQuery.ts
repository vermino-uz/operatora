"use client";

import { useQuery } from "@tanstack/react-query";

import { leadSignalsApi } from "@/services/api/leadAiAssist";

/** One lead's computed `lead_signals` row — fetched only while the AI
 * Assist tab is the active tab (`enabled`), same "fetch on demand, not on
 * mount" rule every other `LeadDetailsModal` tab follows. */
export function useLeadSignalsQuery(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-signals", leadId],
    queryFn: () => leadSignalsApi.get(leadId),
    enabled: enabled && Boolean(leadId),
    staleTime: 30_000,
  });
}
