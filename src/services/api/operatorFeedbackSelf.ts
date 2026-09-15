import { dbProxyQuery } from "@/services/api/db-proxy";
import type { FeedbackItem, QuizAttemptRow, QuizRow } from "@/features/operators/types";

/**
 * "My Feedback" (`/operator-feedbacks`) — the old frontend's
 * `pages/OperatorFeedbacks.tsx` read `feedback`/`quizzes`/`quiz_attempts`
 * directly via `supabase.from(table)` (Postgres RLS did the per-operator
 * filtering). None of the four `operators-page/feedback/*` REST
 * endpoints fit this page's real shape: `pending/:operatorName` and
 * `all` are both hard-gated to admin/sales_manager
 * (`ForbiddenException` otherwise) and `pending` means the wrong status
 * (this page needs *approved* feedback, not pending-for-approval) — so
 * there is genuinely no dedicated REST controller for "my own approved
 * feedback + quizzes + attempts", unlike every other page built so far
 * in this rebuild.
 *
 * `feedback`/`quizzes`/`quiz_attempts` ARE registered in the backend's
 * `db-proxy/table-registry.ts` (`scope: 'workspace' | 'workspace' |
 * 'user'` respectively) — the same sanctioned "no dedicated controller
 * exists yet" escape hatch already used for `canned_responses`
 * (`services/api/cannedResponses.ts`). `quiz_attempts` is `scope: 'user'`,
 * meaning the proxy itself confines reads/writes to the caller's own
 * rows server-side — a real, enforced boundary, not a client-side
 * courtesy filter.
 *
 * **Confirmed backend gap, not silently worked around**: the old
 * frontend's quiz generation call (`supabase.functions.invoke(
 * 'generate-feedback-quiz', {feedbackId, feedbackContent,
 * targetOperators})`) does NOT map onto this backend's real
 * `POST /fn/generate-feedback-quiz` handler
 * (`functions.handlers.ts#generateFeedbackQuiz`) — that handler takes a
 * `{topic}` body and returns a stateless `{quiz: [...]}` AI generation
 * with **no database persistence at all** (no `quizzes` row is ever
 * inserted). This means the "auto-generate a quiz when feedback is
 * approved" behavior (`OperatorsPageService.invokeGenerateQuiz` on the
 * admin side, `operators-page/feedback/sample|decision`) is already
 * non-functional on THIS backend independent of anything built here —
 * approved feedback will not reliably grow a matching `quizzes` row.
 * Per the "flag gaps, don't fake them" rule: this page does not offer a
 * "generate quiz" action at all (the old page's `generateQuiz()` /
 * "Create quiz" button is dropped, not faked); it only renders a quiz
 * if one already exists in the `quizzes` table and lets the operator
 * take/submit it (writing their own `quiz_attempts` row, which the
 * `scope: 'user'` proxy rule genuinely supports). Updating the parent
 * `quizzes.status` to `"completed"` after a submit is also skipped —
 * `quizzes` has `writeRoles: MANAGER_ROLES` in the table registry, so a
 * plain `operator`-role caller would get a real 403 attempting that
 * write; "already attempted" is instead derived purely from this
 * operator's own `quiz_attempts` rows, sidestepping the gap rather than
 * hiding a guaranteed-403 call behind a swallowed error.
 */
export const operatorFeedbackSelfApi = {
  /** Approved feedback whose `target_operators` overlaps any of the
   * caller's known identity strings (email / full name / operator_name).
   * `overlaps` (`&&`) is an ANY-match array operator — exactly right here,
   * since the admin side stores a single identity string per target
   * (email OR display name, whichever the admin picked), not a fixed key. */
  async myApprovedFeedback(identities: string[]): Promise<FeedbackItem[]> {
    if (identities.length === 0) return [];
    const rows = await dbProxyQuery<FeedbackItem[]>("feedback", {
      method: "select",
      select: "*",
      filters: [
        { column: "status", op: "eq", value: "approved" },
        { column: "target_operators", op: "overlaps", value: identities },
      ],
      order: [{ column: "created_at", ascending: false }],
    });
    return rows ?? [];
  },

  /** Quizzes addressed to the caller by any known identity string. */
  async myQuizzes(identities: string[]): Promise<QuizRow[]> {
    if (identities.length === 0) return [];
    const rows = await dbProxyQuery<QuizRow[]>("quizzes", {
      method: "select",
      select: "*",
      filters: [{ column: "operator_name", op: "in", value: identities }],
      order: [{ column: "created_at", ascending: false }],
    });
    return rows ?? [];
  },

  /** The proxy's `scope: 'user'` rule on `quiz_attempts` already confines
   * this to the caller's own rows server-side — no extra filter needed. */
  async myQuizAttempts(): Promise<QuizAttemptRow[]> {
    const rows = await dbProxyQuery<QuizAttemptRow[]>("quiz_attempts", {
      method: "select",
      select: "*",
      order: [{ column: "completed_at", ascending: false }],
    });
    return rows ?? [];
  },

  async submitQuizAttempt(input: {
    quizId: string;
    operatorName: string;
    score: number;
    passed: boolean;
    answers: number[];
    attemptNumber: number;
  }): Promise<QuizAttemptRow> {
    const rows = await dbProxyQuery<QuizAttemptRow[]>("quiz_attempts", {
      method: "insert",
      values: [
        {
          quiz_id: input.quizId,
          operator_name: input.operatorName,
          score: input.score,
          passed: input.passed,
          answers: input.answers,
          attempt_number: input.attemptNumber,
          completed_at: new Date().toISOString(),
        },
      ],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Submit didn't return a row");
    return row;
  },
};
