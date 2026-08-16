import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { brandApi } from "@/services/api/brand";
import type { BrandColor } from "@/features/brand/types";

export function useBrandQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["brand", workspaceId],
    queryFn: () => brandApi.get(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}

export function useSaveBrandMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      logoUrl: string | null;
      colors: BrandColor[];
      fonts: string[];
      style: string | null;
      source?: Record<string, unknown> | null;
    }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return brandApi.save(workspaceId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand", workspaceId] });
    },
  });
}

export function useAnalyzeDomainMutation(workspaceId: string | null) {
  return useMutation({
    mutationFn: (domain: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return brandApi.analyzeDomain(workspaceId, domain);
    },
  });
}
