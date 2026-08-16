"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadCustomFieldsApi } from "@/services/api/leadCustomFields";
import type { UpsertLeadCustomFieldPayload } from "@/features/leads/customFieldTypes";

/** Shared query key — every card/details/create-lead/require-field call
 * site reads the same workspace-wide field-definition list, so this is one
 * cache entry reused everywhere (mirrors the old frontend's own
 * `useLeadCustomFields()` "shares the `['lead-custom-fields']` query cache
 * used across the leads UI" doc comment). */
export function leadCustomFieldsQueryKey() {
  return ["lead-custom-fields"] as const;
}

export function useLeadCustomFieldsQuery() {
  return useQuery({
    queryKey: leadCustomFieldsQueryKey(),
    queryFn: () => leadCustomFieldsApi.list(),
    staleTime: 30_000,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: leadCustomFieldsQueryKey() });
  // Card/details visibility bundles embed the same definitions.
  queryClient.invalidateQueries({ queryKey: ["lead-field-visibility-bundle"] });
}

export function useCreateCustomFieldMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertLeadCustomFieldPayload) => leadCustomFieldsApi.create(payload),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateCustomFieldMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertLeadCustomFieldPayload }) =>
      leadCustomFieldsApi.update(id, payload),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteCustomFieldMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadCustomFieldsApi.remove(id),
    onSuccess: () => invalidate(queryClient),
  });
}
