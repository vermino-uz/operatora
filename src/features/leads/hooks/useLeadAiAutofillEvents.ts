"use client";

import { useQuery } from "@tanstack/react-query";

import { leadAiAutofillEventsApi } from "@/services/api/leadAiAutofillEvents";

export function useLeadAiAutofillEventsQuery(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-ai-autofill-events", leadId],
    queryFn: () => leadAiAutofillEventsApi.list(leadId),
    enabled: enabled && Boolean(leadId),
  });
}
