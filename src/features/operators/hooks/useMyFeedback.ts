import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionStore } from "@/state/session-store";
import { operatorFeedbackSelfApi } from "@/services/api/operatorFeedbackSelf";

/** The caller's own identity strings, as stored by the admin side when
 * targeting feedback/quizzes (email or display name — see
 * `operatorFeedbackSelfApi`'s doc comment). Kept as a small memoized
 * array so it's a stable query-key dependency. */
export function useMyIdentities(): string[] {
  const user = useSessionStore((s) => s.user);
  return useMemo(() => {
    const values = new Set<string>();
    if (user?.email) values.add(user.email);
    if (user?.full_name) values.add(user.full_name);
    if (user?.profile?.full_name) values.add(user.profile.full_name);
    return Array.from(values);
  }, [user]);
}

export function useMyApprovedFeedbackQuery(identities: string[]) {
  return useQuery({
    queryKey: ["operator-feedbacks", "feedback", identities],
    queryFn: () => operatorFeedbackSelfApi.myApprovedFeedback(identities),
    enabled: identities.length > 0,
  });
}

export function useMyQuizzesQuery(identities: string[]) {
  return useQuery({
    queryKey: ["operator-feedbacks", "quizzes", identities],
    queryFn: () => operatorFeedbackSelfApi.myQuizzes(identities),
    enabled: identities.length > 0,
  });
}

export function useMyQuizAttemptsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["operator-feedbacks", "quiz-attempts"],
    queryFn: () => operatorFeedbackSelfApi.myQuizAttempts(),
    enabled,
  });
}

export function useSubmitQuizAttemptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: operatorFeedbackSelfApi.submitQuizAttempt,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operator-feedbacks", "quiz-attempts"] });
    },
  });
}
