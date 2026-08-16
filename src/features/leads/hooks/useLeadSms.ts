"use client";

import { useQuery } from "@tanstack/react-query";

import { leadSmsApi } from "@/services/api/leadSms";

export function useLeadSmsQuery(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-sms", leadId],
    queryFn: () => leadSmsApi.list(leadId),
    enabled: enabled && Boolean(leadId),
  });
}
