import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAiFeedbackApi } from "@/services/api/admin/aiFeedback";
import type { AiFeedbackFilters, ReviewAiFeedbackPatch } from "@/features/admin/types";

const LIST_KEY = ["admin", "ai-feedback"] as const;

export function useAdminAiFeedbackListQuery(filters: AiFeedbackFilters) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: () => adminAiFeedbackApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useReviewAdminAiFeedbackMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ReviewAiFeedbackPatch }) => adminAiFeedbackApi.review(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
