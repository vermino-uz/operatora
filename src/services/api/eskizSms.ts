import { apiFetch } from "@/services/api/client";
import type { EskizAccount, EskizBulkSendResult, EskizGuidance, EskizMessage, EskizTemplate } from "@/features/leads/types";

/**
 * Leads SMS — templates + compose (Phase 2c-8). Traced directly against
 * `eskiz.controller.ts`/`eskiz.service.ts` (`/eskiz/*`), **not** the
 * `lead_sms_templates`/`lead_sms_messages` Prisma tables the old frontend's
 * `LeadSMSTemplatesDialog.tsx`/`SendSMSDialog.tsx` use. Both were traced and
 * compared directly against the real backend before choosing this one — see
 * PROGRESS.md's "Leads — SMS templates + compose" entry for the full
 * reasoning. Short version: `lead_sms_templates`/`lead_sms_messages` are
 * registered in the generic db-proxy (`table-registry.ts`, writable) but no
 * backend service anywhere reads from or processes `lead_sms_messages` —
 * writing there would create a fake "queued" row with no delivery pipeline
 * behind it at all. `/eskiz/*` is the one real, end-to-end pipeline: it
 * actually calls the Eskiz SMS gateway, tracks per-message delivery status
 * via a provider webhook, and gates bulk sends on a real, synced account
 * balance — exactly the "send an SMS to a lead" feature this slice needs to
 * build honestly. The old frontend's own `ComposeSMSDialog.tsx` (bulk, from
 * the Kanban board) already agrees — it's wired to this same `/eskiz/*`
 * contract, not `lead_sms_templates`.
 *
 * Precondition this whole feature has: the workspace must have connected an
 * Eskiz account first (`POST /eskiz/connect`, workspace-owner-only) — that
 * connect flow lives in Settings → Eskiz, which is still an unbuilt
 * placeholder section in this app (`src/constants/settings-sitemap.ts`'s
 * `eskiz` key). Every entry point here handles the resulting 404
 * ("no account connected") with an explicit `EmptyState` pointing at
 * `/settings?section=eskiz`, not a raw error.
 */

export const eskizSmsApi = {
  /** `GET /eskiz/account` — `null` if never connected (not a 404 itself). */
  async getAccount(): Promise<EskizAccount | null> {
    return apiFetch<EskizAccount | null>(`/eskiz/account`);
  },

  /** `GET /eskiz/guidance` — static pricing (`sms_price_uzs`), always
   * available (asset-backed with a hardcoded fallback server-side, never
   * errors). Used for the cost estimate shown before sending. */
  async getGuidance(): Promise<EskizGuidance> {
    return apiFetch<EskizGuidance>(`/eskiz/guidance`);
  },

  /** `GET /eskiz/templates` — every template regardless of moderation
   * status (`moderation` | `approved` | `rejected`); only `approved` ones
   * are sendable. 404s if no account is connected yet. */
  async listTemplates(): Promise<EskizTemplate[]> {
    const data = await apiFetch<EskizTemplate[]>(`/eskiz/templates`);
    return Array.isArray(data) ? data : [];
  },

  /** `POST /eskiz/templates` — submits raw text to Eskiz for moderation;
   * the created row always starts at `status: "moderation"`. There is no
   * update/delete endpoint — a template's approved text is immutable once
   * submitted (Eskiz moderates the literal string), so "copy as new" and
   * "edit" both resolve to submitting a fresh template client-side. */
  async submitTemplate(content: string): Promise<EskizTemplate> {
    return apiFetch<EskizTemplate>(`/eskiz/templates`, { method: "POST", body: { content } });
  },

  /** `POST /eskiz/templates/:id/resubmit` — only valid for a `rejected`
   * template (server-enforced); resends the same content for re-moderation. */
  async resubmitTemplate(id: string): Promise<EskizTemplate> {
    return apiFetch<EskizTemplate>(`/eskiz/templates/${encodeURIComponent(id)}/resubmit`, { method: "POST" });
  },

  /** `POST /eskiz/templates/sync` — refreshes every template's moderation
   * status from Eskiz (approved/rejected/still-moderation), returns the
   * refreshed list. Manual "check status" action, not polled automatically. */
  async syncTemplates(): Promise<EskizTemplate[]> {
    const data = await apiFetch<EskizTemplate[]>(`/eskiz/templates/sync`, { method: "POST" });
    return Array.isArray(data) ? data : [];
  },

  /** `POST /eskiz/send` — single-lead compose. `text` optionally overrides
   * the approved template's body (e.g. to substitute a name/date); Eskiz
   * rejects the send outright if the override text doesn't structurally
   * match the approved template, which surfaces as a normal 400. Returns
   * the created `eskiz_messages` row, including `chat_id` — the caller
   * links that chat to the lead right after a successful send (see
   * `linkChatToLead`) so the lead's SMS tab picks the conversation up. */
  async send(payload: { phone: string; template_id: string; text?: string }): Promise<EskizMessage> {
    return apiFetch<EskizMessage>(`/eskiz/send`, { method: "POST", body: payload });
  },

  /** `POST /eskiz/send/bulk` — real, server-orchestrated bulk send (one
   * call, not N client-side sends): the backend re-resolves every matching
   * lead's primary phone itself (`boardId` + optional `columnIds` stage
   * filter + optional `dateFrom`/`dateTo` on `created_at`), balance-gates
   * the whole batch up front, then paces the sends server-side in the
   * background. This client only ever fires this one request — no
   * client-orchestrated loop, so no double-submit/idempotency risk beyond
   * the standard "guard the mutation while pending" rule already applied
   * everywhere else in this feature. Manager/admin-only server-side (403
   * otherwise) — the compose entry point is hidden from other roles too. */
  async sendBulk(payload: {
    boardId: string;
    template_id: string;
    columnIds?: string[];
    dateFrom?: string | null;
    dateTo?: string | null;
  }): Promise<EskizBulkSendResult> {
    return apiFetch<EskizBulkSendResult>(`/eskiz/send/bulk`, { method: "POST", body: payload });
  },

  /** `GET /eskiz/chats` — every SMS conversation in the workspace (keyed by
   * phone number), each optionally `linked_lead_id`-tagged. No `?lead_id=`
   * filter exists server-side, so resolving "this lead's SMS messages"
   * means listing every chat and filtering client-side for the one (if
   * any) already linked to this lead — see `getMessagesForLead` below. */
  async listChats(): Promise<{ id: string; phone_number: string; linked_lead_id: string | null }[]> {
    const data = await apiFetch<{ id: string; phone_number: string; linked_lead_id: string | null }[]>(`/eskiz/chats`);
    return Array.isArray(data) ? data : [];
  },

  /** `PATCH /eskiz/chats/:id/link-lead` — links (or with `leadId: null`,
   * unlinks) a chat to a lead. Called automatically right after a
   * successful single-lead send so the tab feed below stays accurate
   * without asking the operator to link it manually. */
  async linkChatToLead(chatId: string, leadId: string | null): Promise<{ id: string; linked_lead_id: string | null }> {
    return apiFetch(`/eskiz/chats/${encodeURIComponent(chatId)}/link-lead`, { method: "PATCH", body: { lead_id: leadId } });
  },

  /** `GET /eskiz/chats/:id/messages` — every message in one chat, oldest
   * first. */
  async listChatMessages(chatId: string): Promise<EskizMessage[]> {
    const data = await apiFetch<EskizMessage[]>(`/eskiz/chats/${encodeURIComponent(chatId)}/messages`);
    return Array.isArray(data) ? data : [];
  },

  /** Composed read for the lead's SMS tab: find the (at most one) chat
   * already linked to this lead, then its messages — two real requests,
   * no fabricated single-endpoint shortcut. Returns `[]` if the lead has no
   * linked chat yet (nothing sent to it via this pipeline). */
  async getMessagesForLead(leadId: string): Promise<EskizMessage[]> {
    const chats = await eskizSmsApi.listChats();
    const chat = chats.find((c) => c.linked_lead_id === leadId);
    if (!chat) return [];
    return eskizSmsApi.listChatMessages(chat.id);
  },
};
