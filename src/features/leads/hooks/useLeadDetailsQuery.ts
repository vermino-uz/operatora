"use client";

import { useQuery } from "@tanstack/react-query";

import { leadsApi } from "@/services/api/leads";

export function leadQueryKey(leadId: string | null) {
  return ["lead", leadId] as const;
}

/** Fresh single-lead read for the details modal (`GET /leads/:id`) — the
 * modal seeds its initial render from the card's already-cached row (see
 * `LeadDetailsModal`) so it never opens blank while this resolves. */
export function useLeadDetailsQuery(leadId: string | null) {
  return useQuery({
    queryKey: leadQueryKey(leadId),
    queryFn: () => leadsApi.getLead(leadId as string),
    enabled: Boolean(leadId),
    staleTime: 5_000,
  });
}
