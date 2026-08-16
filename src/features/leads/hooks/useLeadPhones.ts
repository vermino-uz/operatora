"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadPhonesApi } from "@/services/api/leads";

function phonesKey(leadId: string) {
  return ["lead-phones", leadId] as const;
}

/** Unlike every other tab's hook in this file, this one has no `enabled`
 * gate tied to a tab switch — additional phone numbers render inline on the
 * always-visible Info tab, not a lazily-mounted one, matching the old
 * frontend's `LeadAdditionalPhones.tsx` placement. */
export function useLeadPhonesQuery(leadId: string) {
  return useQuery({
    queryKey: phonesKey(leadId),
    queryFn: () => leadPhonesApi.list(leadId),
    enabled: Boolean(leadId),
  });
}

export function useLeadPhoneMutations(leadId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: phonesKey(leadId) });

  const add = useMutation({
    mutationFn: (payload: { phone_number: string; label?: string }) => leadPhonesApi.add(leadId, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (phoneId: string) => leadPhonesApi.remove(leadId, phoneId),
    onSuccess: invalidate,
  });

  return { add, remove };
}
