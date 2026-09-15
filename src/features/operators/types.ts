/**
 * Operators — traced from the old frontend's `pages/Operators.tsx` +
 * `pages/OperatorFeedbacks.tsx` and the components under
 * `components/operators/*`, against the real backend
 * `operators-page/*` controllers (`operators-page.module.ts`):
 * `OperatorsOverviewController`, `OperatorProfileController`,
 * `OperatorConversationsController`, `OperatorFeedbackController`.
 *
 * This is a distinct entity from workspace *team membership*
 * (`workspace_users`, covered by `src/features/team/` against
 * `/admin-users/operators`) — the `operators` Prisma table here is
 * `{id, profile_id, operator_name, internal_number, is_active}`, joined
 * with `profiles` for display, and is what `leads.assigned_operator_id`
 * actually references. `/operators` is a performance leaderboard (AI
 * score, call volume, conversions) over that table + `conversations`,
 * not a roster/invite screen — inviting teammates already exists under
 * Settings → Team.
 */

/** `GET /operators-page/operators` row shape — `OperatorsPageService
 * .getOperatorsOverview()` spreads the `profiles` row and merges in
 * `operator_name`/`internal_number`/`operator_id` from the `operators`
 * table. No pagination envelope — bare array, confirmed by the service's
 * `return profiles.map(...)`. */
export interface OperatorOverviewRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  operator_name: string | null;
  internal_number: string | null;
  operator_id: string | null;
  [key: string]: unknown;
}

/** `operators-page/operators` + `operators-page/conversations` conversation
 * row shape — this endpoint returns raw `conversations` table rows
 * (`OperatorsPageService.getConversations`/`getOperatorConversations`),
 * a different (wider, less normalized) shape than
 * `src/features/conversations/types.ts`'s `Conversation` (that one is
 * built against `/conversations` list/detail DTOs). Kept separate rather
 * than reused, to not couple the two features to one shape that happens
 * to look similar today. */
export interface OperatorConversationRow {
  id: string;
  operator_name: string | null;
  client_phone?: string | null;
  client_name?: string | null;
  ai_score: number | null;
  sentiment: string | null;
  disposition: string | null;
  duration_sec: number | null;
  duration?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  conversation_date?: string | null;
  created_at: string;
  [key: string]: unknown;
}

/** `GET/PATCH /operators-page/operator-profile/:profileId` — the
 * `operators` table row itself (get-or-create semantics on GET). */
export interface OperatorProfileRecord {
  id: string;
  profile_id: string;
  operator_name: string;
  internal_number: string | null;
  is_active: boolean;
  [key: string]: unknown;
}

/** `feedback` table row, as returned by the `operators-page/feedback/*`
 * endpoints (admin/sales_manager only) and, read-only, via the generic
 * `POST /db/feedback/query` proxy (used by the personal "My Feedback"
 * view — see `operator-feedbacks` doc comments for why). */
export interface FeedbackItem {
  id: string;
  title: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  target_operators: string[] | null;
  created_by: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  [key: string]: unknown;
}

export interface FeedbackStats {
  totalOperators: number;
  quizzesGenerated: number;
  completed: number;
  passed: number;
  failed: number;
  pending: number;
  completionRate: number;
  passRate: number;
  avgScore: number;
}

/** `GET /operators-page/feedback/all` row — a `FeedbackItem` enriched
 * with quiz completion stats (`OperatorsPageService.getAllFeedbacks`). */
export interface FeedbackWithStats extends FeedbackItem {
  stats: FeedbackStats;
}

/** `quizzes` table row (read via the `db` proxy only — no dedicated
 * `operators-page` endpoint returns this shape; see `operator-feedbacks`
 * doc comments). */
export interface QuizRow {
  id: string;
  status: "pending" | "completed" | "expired" | string;
  expires_at: string | null;
  created_at: string;
  feedback_id: string;
  operator_name: string | null;
  questions: QuizQuestion[] | null;
  [key: string]: unknown;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

/** `quiz_attempts` table row (read/write via the `db` proxy; scope =
 * `user`, so reads/writes are already confined server-side to the
 * caller's own rows — see `operator-feedbacks` doc comments). */
export interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  operator_name: string | null;
  score: number;
  passed: boolean;
  completed_at: string;
  time_taken_seconds: number | null;
  attempt_number: number | null;
  answers: number[] | null;
  [key: string]: unknown;
}
