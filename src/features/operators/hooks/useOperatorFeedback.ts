import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { operatorsApi } from "@/services/api/operators";

/** Feedback/coaching management — all four endpoints here are gated
 * server-side to admin/sales_manager (`ForbiddenException` otherwise);
 * these hooks back the "Send feedback" and "All feedback" dialogs, both
 * only rendered for `MANAGER_ROLES` callers in the page itself. */
export function usePendingFeedbackQuery(operatorName: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["operators-page", "pending-feedback", operatorName],
    queryFn: () => operatorsApi.pendingFeedback(operatorName as string),
    enabled: enabled && Boolean(operatorName),
  });
}

export function useSendSampleFeedbackMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { operatorName: string; title: string; content: string }) => operatorsApi.sendSampleFeedback(body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["operators-page", "pending-feedback", variables.operatorName] });
      void queryClient.invalidateQueries({ queryKey: ["operators-page", "all-feedbacks"] });
    },
  });
}

export function useFeedbackDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ feedbackId, approve }: { feedbackId: string; approve: boolean }) =>
      operatorsApi.decideFeedback(feedbackId, approve),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operators-page", "pending-feedback"] });
      void queryClient.invalidateQueries({ queryKey: ["operators-page", "all-feedbacks"] });
    },
  });
}

export function useAllFeedbacksQuery(params: { status: string; days: 7 | 30 | 90 }, enabled: boolean) {
  return useQuery({
    queryKey: ["operators-page", "all-feedbacks", params.status, params.days],
    queryFn: () => operatorsApi.allFeedbacks(params),
    enabled,
  });
}
