import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFeedbackApi } from "@/services/api/admin/feedback";
import type { FeedbackFilters } from "@/features/admin/types";

const LIST_KEY = ["admin", "feedback"] as const;

export function useAdminFeedbackListQuery(filters: FeedbackFilters) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: () => adminFeedbackApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useUpdateAdminFeedbackStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) =>
      adminFeedbackApi.updateStatus(id, status, adminNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateAdminFeedbackNotesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => adminFeedbackApi.updateNotes(id, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDeleteAdminFeedbackMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFeedbackApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
