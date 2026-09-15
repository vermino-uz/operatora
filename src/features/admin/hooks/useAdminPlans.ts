import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPlansApi } from "@/services/api/admin/plans";
import type { AiModelPricingRow, UpdatePlanPayload } from "@/features/admin/types";

export function useAdminPlansQuery() {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => adminPlansApi.list(),
  });
}

export function useUpdateAdminPlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, patch }: { slug: string; patch: UpdatePlanPayload }) => adminPlansApi.update(slug, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "plans"] }),
  });
}

export function useAdminAiModelPricingQuery() {
  return useQuery({
    queryKey: ["admin", "ai-model-pricing"],
    queryFn: () => adminPlansApi.pricing(),
  });
}

export function useUpdateAdminAiModelPricingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pricing: AiModelPricingRow[]) => adminPlansApi.updatePricing(pricing),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ai-model-pricing"] }),
  });
}
