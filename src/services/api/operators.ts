import { apiFetch } from "@/services/api/client";
import type {
  FeedbackItem,
  FeedbackWithStats,
  OperatorConversationRow,
  OperatorOverviewRow,
  OperatorProfileRecord,
} from "@/features/operators/types";

/** Real backend contract, traced from `operators-page.module.ts` and its
 * four controllers (`operators-overview`, `operator-profile`,
 * `operator-conversations`, `operator-feedback`) — see
 * `features/operators/types.ts`'s file-level doc comment. All endpoints
 * are bare-array/bare-object responses, no `{data,count}`-style envelope
 * (confirmed against `OperatorsPageService`'s return statements), so no
 * `Paginated<T>` normalization is needed here. */
export const operatorsApi = {
  /** `GET /operators-page/operators` — every operator in the workspace
   * merged with their profile. */
  list(): Promise<OperatorOverviewRow[]> {
    return apiFetch<OperatorOverviewRow[]>("/operators-page/operators");
  },

  /** `GET /operators-page/conversations?from=&to=&limit=` — all
   * conversations in the date range, used client-side to compute
   * per-operator metrics (same matching logic as the old frontend's
   * `matchConversationToOperator`, ported to `matchOperatorConversation`
   * in `features/operators/matchConversation.ts`). */
  conversations(params: { from?: string; to?: string; limit?: number } = {}): Promise<OperatorConversationRow[]> {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    q.set("limit", String(params.limit ?? 5000));
    return apiFetch<OperatorConversationRow[]>(`/operators-page/conversations?${q.toString()}`);
  },

  /** `GET /operators-page/operator-conversations/:operatorName` — a
   * single operator's full conversation history, matched fuzzily
   * server-side against name/email/alias query params. */
  conversationsForOperator(
    operatorName: string,
    aliases: { displayName?: string; storedName?: string; email?: string; fullName?: string } = {},
  ): Promise<OperatorConversationRow[]> {
    const q = new URLSearchParams();
    if (aliases.displayName) q.set("displayName", aliases.displayName);
    if (aliases.storedName) q.set("storedName", aliases.storedName);
    if (aliases.email) q.set("email", aliases.email);
    if (aliases.fullName) q.set("fullName", aliases.fullName);
    return apiFetch<OperatorConversationRow[]>(
      `/operators-page/operator-conversations/${encodeURIComponent(operatorName)}?${q.toString()}`,
    );
  },

  /** `GET /operators-page/operator-profile/:profileId?operatorName=` —
   * get-or-create; 403 if the caller isn't admin/sales_manager. */
  getOrCreateProfile(profileId: string, operatorName: string): Promise<OperatorProfileRecord> {
    return apiFetch<OperatorProfileRecord>(
      `/operators-page/operator-profile/${encodeURIComponent(profileId)}?operatorName=${encodeURIComponent(operatorName)}`,
    );
  },

  /** `PATCH /operators-page/operator-profile/:profileId`. */
  updateProfile(
    profileId: string,
    body: { internalNumber?: string | null; operatorName?: string },
  ): Promise<OperatorProfileRecord> {
    return apiFetch<OperatorProfileRecord>(`/operators-page/operator-profile/${encodeURIComponent(profileId)}`, {
      method: "PATCH",
      body,
    });
  },

  /** `GET /operators-page/feedback/pending/:operatorName` — admin/sales_manager only. */
  pendingFeedback(operatorName: string): Promise<FeedbackItem[]> {
    return apiFetch<FeedbackItem[]>(`/operators-page/feedback/pending/${encodeURIComponent(operatorName)}`);
  },

  /** `POST /operators-page/feedback/sample` — admin/sales_manager only. */
  sendSampleFeedback(body: { operatorName: string; title: string; content: string }): Promise<FeedbackItem> {
    return apiFetch<FeedbackItem>("/operators-page/feedback/sample", { method: "POST", body });
  },

  /** `POST /operators-page/feedback/:feedbackId/decision` — admin/sales_manager only. */
  decideFeedback(feedbackId: string, approve: boolean): Promise<FeedbackItem> {
    return apiFetch<FeedbackItem>(`/operators-page/feedback/${encodeURIComponent(feedbackId)}/decision`, {
      method: "POST",
      body: { approve },
    });
  },

  /** `GET /operators-page/feedback/all?status=&days=` — admin/sales_manager only. */
  allFeedbacks(params: { status?: string; days?: 7 | 30 | 90 } = {}): Promise<FeedbackWithStats[]> {
    const q = new URLSearchParams();
    q.set("status", params.status ?? "all");
    q.set("days", String(params.days ?? 30));
    return apiFetch<FeedbackWithStats[]>(`/operators-page/feedback/all?${q.toString()}`);
  },
};
