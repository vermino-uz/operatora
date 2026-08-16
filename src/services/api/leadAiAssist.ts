import { apiFetch } from "@/services/api/client";

/**
 * Lead AI Assist — `POST /api/fn/lead-ai-assist`. Traced to
 * `FunctionsController.dispatch('lead-ai-assist')` ->
 * `FunctionsHandlersService.aiChatHandler('lead-assist', body, user)` ->
 * `AiChatService.chat()`, the exact same unified chat service backing
 * Conversations' `conversation-ai-assistant` (see
 * `services/api/conversations.ts`'s `conversationAiAssistantApi` doc
 * comment — same dispatch shape, different `chatMode`). Plain JSON
 * request/response, NOT SSE.
 *
 * `FunctionsHandlersService.aiChatHandler()` special-cases `mode ===
 * 'lead-assist'`: it wraps the plain `{reply}` from `AiChatService.chat()`
 * into a richer envelope the old frontend's `LeadAIAssist.tsx` already
 * expected (`{response: {talk_track, follow_up_question, sms_follow_up},
 * data_sources, word_counts, preset_type, thread_id, model}`) — confirmed
 * directly in `functions.handlers.ts`. `follow_up_question`/`sms_follow_up`
 * are always empty strings today (the structured multi-field response the
 * old comment calls "pending" was never actually implemented server-side),
 * so only `talk_track` is rendered here; the other two fields are typed but
 * intentionally unused.
 */
export interface LeadAiAssistRequest {
  leadId: string;
  prompt: string;
  presetType?: string;
  chatHistory: Array<{ type: "user" | "assistant"; content: string }>;
}

export interface LeadAiAssistResponse {
  response: {
    talk_track: string;
    follow_up_question: string;
    sms_follow_up: string;
  };
  data_sources?: unknown[];
  word_counts?: { talk_track: number; follow_up: number };
  preset_type?: string | null;
  thread_id?: string | null;
  model?: string;
}

export const leadAiAssistApi = {
  async send(body: LeadAiAssistRequest): Promise<LeadAiAssistResponse> {
    return apiFetch<LeadAiAssistResponse>("/fn/lead-ai-assist", {
      method: "POST",
      body,
    });
  },
};

/**
 * `GET /signals/lead/:leadId` (`SignalsWorkerController.getLeadSignals`) —
 * the computed `lead_signals` row (buying-intent score, sentiment, silence
 * days, next-action, key signals, ...) a background worker
 * (`signals-worker/signal-extractor.service.ts`) keeps up to date from call/
 * message history. Read-only from the frontend; `null` if not yet computed
 * for this lead. No `workspace_id` is sent — the backend defaults to the
 * caller's JWT workspace, matching every other scoped endpoint in this app.
 */
export interface LeadSignalsRow {
  buying_intent_score?: number | null;
  intent_score_24h_delta?: number | null;
  sentiment_score?: number | null;
  silence_days?: number | null;
  last_summary_text?: string | null;
  last_summary_at?: string | null;
  key_signals?: string[] | null;
  next_action_promised?: string | null;
  next_action_due_at?: string | null;
  channels_used?: string[] | null;
  last_channel?: string | null;
  last_activity_at?: string | null;
  total_messages_count?: number | null;
  total_calls_count?: number | null;
  updated_at?: string | null;
}

export const leadSignalsApi = {
  async get(leadId: string): Promise<LeadSignalsRow | null> {
    return apiFetch<LeadSignalsRow | null>(`/signals/lead/${encodeURIComponent(leadId)}`);
  },
};
