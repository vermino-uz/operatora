"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { integrationsApi } from "@/services/api/crm";
import type { IntegrationFieldMapping, IntegrationProvider } from "@/features/crm/types";

const listKey = ["integrations"] as const;

export function useIntegrationsQuery(enabled = true) {
  return useQuery({
    queryKey: listKey,
    queryFn: () => integrationsApi.list(),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateIntegrationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      provider: IntegrationProvider;
      name: string;
      config?: Record<string, unknown>;
      field_mappings?: IntegrationFieldMapping[];
    }) => integrationsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
  });
}

export function useDeleteIntegrationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
  });
}
