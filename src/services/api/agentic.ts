import { apiFetch } from "@/services/api/client";
import { telegramChatsApi } from "@/services/api/telegramMessages";

export type AgenticChannel = "telegram" | "instagram";

function agenticBase(channel: AgenticChannel): string {
  return channel === "instagram" ? "/instagram-agentic" : "/telegram-agentic";
}

export type AgenticResponseMode = "manual" | "auto";
export type AgenticResponseDelayMode = "instant" | "short" | "long";
export type AgenticTargeting = "new_only" | "everyone" | "selected";
export type AgenticConfidence = "high" | "medium" | "low";

export interface AgenticHandoffRules {
  customer_asks_human: boolean;
  negative_sentiment: boolean;
  payment_refund_contract: boolean;
  low_confidence: boolean;
  outside_working_hours: boolean;
  contact_info_shared: boolean;
  requests_callback: boolean;
}

export interface AgenticWorkingHours {
  start: string;
  end: string;
}

export interface AgenticBlockReason {
  reason: string | null;
  blocked_at: string;
  blocked_by: string | null;
}

export interface AgenticSettings {
  id: string;
  workspace_id: string;
  enabled: boolean;
  instructions: string | null;
  response_mode: AgenticResponseMode;
  voice_percent: number;
  targeting: AgenticTargeting;
  selected_chat_ids: string[];
  blocked_chat_ids: string[];
  blocked_chat_reasons: Record<string, AgenticBlockReason>;
  handoff: AgenticHandoffRules;
  working_hours: AgenticWorkingHours;
  auto_send_seconds: number;
  response_delay_mode: AgenticResponseDelayMode;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AgenticSettingsInput = Partial<
  Pick<
    AgenticSettings,
    | "enabled"
    | "instructions"
    | "response_mode"
    | "voice_percent"
    | "targeting"
    | "selected_chat_ids"
    | "handoff"
    | "working_hours"
    | "auto_send_seconds"
    | "response_delay_mode"
  >
>;

export interface AgenticStatus {
  businessConnected: boolean;
  canReply: boolean;
  replyBlocked: boolean;
  botUsername: string | null;
}

export interface AwayReplyChat {
  chat_id: string;
  name: string | null;
  phone: string | null;
  last_away_reply_at: string;
  preview: string;
}

export type AgentTone = "friendly" | "formal" | "sales" | "short";
export type PricingDisclosure = "end_of_conversation" | "on_request" | "never";

export interface AgentProduct {
  name: string;
  price?: string | null;
}

export interface WorkspaceAgentProfile {
  workspace_id: string;
  business_name: string | null;
  tagline: string | null;
  languages: string[];
  city: string | null;
  address: string | null;
  working_days: number[];
  hours_start: string;
  hours_end: string;
  timezone: string | null;
  tone: AgentTone | null;
  pricing_disclosure: PricingDisclosure | null;
  human_contact: string | null;
  never_do: string[];
  products: AgentProduct[];
  payment_methods: string[];
  extra_instructions: string | null;
  setup_completed_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkspaceAgentProfileInput = Partial<{
  business_name: string | null;
  tagline: string | null;
  languages: string[];
  city: string | null;
  address: string | null;
  working_days: number[];
  hours_start: string;
  hours_end: string;
  timezone: string | null;
  tone: AgentTone | null;
  pricing_disclosure: PricingDisclosure | null;
  human_contact: string | null;
  never_do: string[];
  products: AgentProduct[];
  payment_methods: string[];
  extra_instructions: string | null;
  mark_setup_complete: boolean;
  channel?: AgenticChannel;
  channel_settings?: {
    enabled?: boolean;
    targeting?: AgenticTargeting;
    selected_chat_ids?: string[];
    handoff?: Partial<AgenticHandoffRules>;
  };
}>;

export interface BlacklistedChat {
  chat_id: string;
  name: string | null;
  username: string | null;
  phone: string | null;
  found: boolean;
  reason: string | null;
  blocked_at: string | null;
  blocked_by: string | null;
}

export interface CustomerSearchResult {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
}

export type KnowledgeKind = "text" | "file" | "url";
export type KnowledgeStatus = "pending" | "processing" | "ready" | "failed";

export interface KnowledgeSource {
  id: string;
  workspace_id: string;
  kind: KnowledgeKind;
  title: string;
  source_ref: string | null;
  status: KnowledgeStatus;
  error: string | null;
  bytes: number | null;
  chunk_count: number;
  channels: AgenticChannel[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSourceContent {
  id: string;
  title: string;
  kind: string;
  text: string;
}

export async function getAgenticSettings(channel: AgenticChannel = "telegram"): Promise<AgenticSettings> {
  return apiFetch<AgenticSettings>(`${agenticBase(channel)}/settings`);
}

export async function getAwayReplies(channel: AgenticChannel = "telegram"): Promise<AwayReplyChat[]> {
  return apiFetch<AwayReplyChat[]>(`${agenticBase(channel)}/away-replies`);
}

export async function getAgenticStatus(channel: AgenticChannel = "telegram"): Promise<AgenticStatus> {
  return apiFetch<AgenticStatus>(`${agenticBase(channel)}/status`);
}

export async function saveAgenticSettings(
  input: AgenticSettingsInput,
  channel: AgenticChannel = "telegram",
): Promise<AgenticSettings> {
  return apiFetch<AgenticSettings>(`${agenticBase(channel)}/settings`, {
    method: "PUT",
    body: input,
  });
}

export async function getAgentProfile(): Promise<WorkspaceAgentProfile> {
  return apiFetch<WorkspaceAgentProfile>("/telegram-agentic/profile");
}

export async function saveAgentProfile(input: WorkspaceAgentProfileInput): Promise<WorkspaceAgentProfile> {
  return apiFetch<WorkspaceAgentProfile>("/telegram-agentic/profile", {
    method: "PUT",
    body: input,
  });
}

export async function setChatExcluded(
  chatId: string,
  excluded: boolean,
  channel: AgenticChannel = "telegram",
  reason?: string,
): Promise<{ excluded: boolean }> {
  return apiFetch<{ excluded: boolean }>(`${agenticBase(channel)}/chats/${encodeURIComponent(chatId)}/exclude`, {
    method: "POST",
    body: { excluded, reason },
  });
}

export async function getBlacklist(channel: AgenticChannel = "telegram"): Promise<BlacklistedChat[]> {
  return apiFetch<BlacklistedChat[]>(`${agenticBase(channel)}/blacklist`);
}

export async function searchCustomers(
  query: string,
  workspaceId: string,
  channel: AgenticChannel = "telegram",
): Promise<CustomerSearchResult[]> {
  if (channel === "instagram") {
    const qs = new URLSearchParams({ search: query, limit: "20" });
    const { conversations } = await apiFetch<{ conversations: Array<Record<string, unknown>> }>(
      `/instagram/conversations/search?${qs.toString()}`,
    );
    return conversations.map((c) => ({
      id: String(c.id),
      name: String(c.participant_name || c.participant_username || c.id),
      username: (c.participant_username as string | null) ?? null,
      phone: null,
    }));
  }
  const chats = await telegramChatsApi.list({ workspaceId, search: query, limit: 20 });
  return chats.map((c) => ({
    id: c.id,
    name:
      c.display_name ||
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.username ||
      c.id,
    username: c.username ?? null,
    phone: null,
  }));
}

export async function getKnowledge(channel: AgenticChannel = "telegram"): Promise<KnowledgeSource[]> {
  return apiFetch<KnowledgeSource[]>(`${agenticBase(channel)}/knowledge`);
}

export async function getAvailableKnowledge(channel: AgenticChannel = "telegram"): Promise<KnowledgeSource[]> {
  return apiFetch<KnowledgeSource[]>(`${agenticBase(channel)}/knowledge/available`);
}

export async function includeKnowledgeChannel(
  id: string,
  channel: AgenticChannel = "telegram",
): Promise<KnowledgeSource> {
  return apiFetch<KnowledgeSource>(`${agenticBase(channel)}/knowledge/${id}/include`, { method: "POST" });
}

export async function setKnowledgeSourceChannel(
  id: string,
  targetChannel: AgenticChannel,
  enabled: boolean,
  viaChannel: AgenticChannel = "telegram",
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`${agenticBase(viaChannel)}/knowledge/${id}/channels/${targetChannel}`, {
    method: "PUT",
    body: { enabled },
  });
}

export async function addKnowledgeText(
  title: string,
  text: string,
  channel: AgenticChannel = "telegram",
): Promise<KnowledgeSource> {
  return apiFetch<KnowledgeSource>(`${agenticBase(channel)}/knowledge/text`, {
    method: "POST",
    body: { title, text },
  });
}

export async function addKnowledgeUrl(url: string, channel: AgenticChannel = "telegram"): Promise<KnowledgeSource> {
  return apiFetch<KnowledgeSource>(`${agenticBase(channel)}/knowledge/url`, {
    method: "POST",
    body: { url },
  });
}

export async function uploadKnowledgeFile(file: File, channel: AgenticChannel = "telegram"): Promise<KnowledgeSource> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<KnowledgeSource>(`${agenticBase(channel)}/knowledge/upload`, {
    method: "POST",
    body: form,
  });
}

export async function getKnowledgeContent(
  id: string,
  channel: AgenticChannel = "telegram",
): Promise<KnowledgeSourceContent> {
  return apiFetch<KnowledgeSourceContent>(`${agenticBase(channel)}/knowledge/${id}/content`);
}

export async function deleteKnowledge(id: string, channel: AgenticChannel = "telegram"): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`${agenticBase(channel)}/knowledge/${id}`, { method: "DELETE" });
}

export async function takeOverChat(
  chatId: string,
  channel: AgenticChannel = "telegram",
): Promise<{ paused: boolean }> {
  return apiFetch(`${agenticBase(channel)}/chats/${encodeURIComponent(chatId)}/takeover`, { method: "POST" });
}

export async function resumeChat(chatId: string, channel: AgenticChannel = "telegram"): Promise<{ paused: boolean }> {
  return apiFetch(`${agenticBase(channel)}/chats/${encodeURIComponent(chatId)}/resume`, { method: "POST" });
}

// --- Draft queue ----------------------------------------------------------------

export type AgenticDraftStatus = "pending" | "approved" | "sent" | "rejected" | "discarded";

export interface AgenticDraft {
  id: string;
  workspace_id: string;
  chat_id: string;
  draft_text: string;
  is_voice: boolean;
  voice_duration_sec: number | null;
  confidence: AgenticConfidence;
  based_on: string[];
  status: AgenticDraftStatus;
  auto_send_at: string | null;
  trigger_message_id: string | null;
  sent_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getAgenticDrafts(
  params?: { chat_id?: string; status?: string },
  channel: AgenticChannel = "telegram",
): Promise<AgenticDraft[]> {
  const qs = new URLSearchParams();
  if (params?.chat_id) qs.set("chat_id", params.chat_id);
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<AgenticDraft[]>(`${agenticBase(channel)}/drafts${suffix}`);
}

export async function approveDraft(
  id: string,
  body?: { text?: string; is_voice?: boolean },
  channel: AgenticChannel = "telegram",
): Promise<AgenticDraft> {
  return apiFetch<AgenticDraft>(`${agenticBase(channel)}/drafts/${id}/approve`, {
    method: "POST",
    body: body ?? {},
  });
}

export async function rejectDraft(id: string, channel: AgenticChannel = "telegram"): Promise<AgenticDraft> {
  return apiFetch<AgenticDraft>(`${agenticBase(channel)}/drafts/${id}/reject`, { method: "POST" });
}

export async function discardDraft(id: string, channel: AgenticChannel = "telegram"): Promise<AgenticDraft> {
  return apiFetch<AgenticDraft>(`${agenticBase(channel)}/drafts/${id}/discard`, { method: "POST" });
}

export async function regenerateDraft(id: string, channel: AgenticChannel = "telegram"): Promise<AgenticDraft> {
  return apiFetch<AgenticDraft>(`${agenticBase(channel)}/drafts/${id}/regenerate`, { method: "POST" });
}

export async function approveAllDrafts(
  channel: AgenticChannel = "telegram",
): Promise<{ sent: number; total: number }> {
  return apiFetch(`${agenticBase(channel)}/approve-all`, { method: "POST" });
}

export async function suggestReply(
  chatId: string,
  channel: AgenticChannel = "telegram",
): Promise<{ text: string }> {
  return apiFetch(`${agenticBase(channel)}/chats/${encodeURIComponent(chatId)}/suggest`, { method: "POST" });
}

// --- Copilot --------------------------------------------------------------------

export type CopilotAction = "answer" | "send_text" | "send_voice";

export interface CopilotMessage {
  id: string;
  workspace_id: string;
  chat_id: string;
  role: "operator" | "assistant";
  content: string;
  action: CopilotAction | "escalation" | null;
  kind?: "reply" | "escalation" | null;
  seen?: boolean | null;
  recap?: string | null;
  sent_message_id: string | null;
  sent_text: string | null;
  sent_is_voice: boolean | null;
  error: string | null;
  created_by: string | null;
  created_at: string;
}

export async function getCopilotMessages(chatId: string, channel: AgenticChannel = "telegram"): Promise<CopilotMessage[]> {
  return apiFetch<CopilotMessage[]>(`${agenticBase(channel)}/copilot/${encodeURIComponent(chatId)}/messages`);
}

export async function sendCopilotCommand(
  chatId: string,
  command: string,
  channel: AgenticChannel = "telegram",
): Promise<{ operator: CopilotMessage; assistant: CopilotMessage }> {
  return apiFetch(`${agenticBase(channel)}/copilot/${encodeURIComponent(chatId)}`, {
    method: "POST",
    body: { command },
  });
}

export async function getCopilotUnseen(chatId: string, channel: AgenticChannel = "telegram"): Promise<{ count: number }> {
  return apiFetch(`${agenticBase(channel)}/copilot/${encodeURIComponent(chatId)}/unseen`);
}

export async function markCopilotSeen(chatId: string, channel: AgenticChannel = "telegram"): Promise<{ ok: boolean }> {
  return apiFetch(`${agenticBase(channel)}/copilot/${encodeURIComponent(chatId)}/seen`, { method: "POST" });
}

export async function getCopilotSuggestions(
  chatId: string,
  channel: AgenticChannel = "telegram",
  lang = "en",
): Promise<{ suggestions: string[] }> {
  const qs = new URLSearchParams({ lang });
  return apiFetch(`${agenticBase(channel)}/copilot/${encodeURIComponent(chatId)}/suggestions?${qs.toString()}`);
}

// --- Lead actions ---------------------------------------------------------------

export interface AgentLeadAction {
  id: string;
  workspace_id: string;
  lead_id: string;
  chat_id: string | null;
  action: "status_change" | "comment";
  detail: Record<string, unknown>;
  summary: string;
  source: "auto" | "copilot";
  reverted: boolean;
  reverted_at: string | null;
  created_at: string;
}

export interface LeadActionsPanel {
  linked: boolean;
  lead: { lead_id: string; column_name: string | null; stages: string[] } | null;
  actions: AgentLeadAction[];
}

export async function getLeadActions(chatId: string, channel: AgenticChannel = "telegram"): Promise<LeadActionsPanel> {
  return apiFetch<LeadActionsPanel>(`${agenticBase(channel)}/lead-actions/${encodeURIComponent(chatId)}`);
}

export async function revertLeadAction(actionId: string, channel: AgenticChannel = "telegram"): Promise<{ ok: boolean }> {
  return apiFetch(`${agenticBase(channel)}/lead-actions/${encodeURIComponent(actionId)}/revert`, { method: "POST" });
}

// --- Recap + catch-up -----------------------------------------------------------

export interface ChatRecap {
  available: boolean;
  reason?: string;
  summary?: string;
  headline?: string;
  next_step?: string;
  stage?: string;
  customer_waiting?: boolean;
  generated_at?: string;
  cached?: boolean;
}

export async function getChatRecap(
  chatId: string,
  channel: AgenticChannel = "telegram",
  opts?: { refresh?: boolean; lang?: string },
): Promise<ChatRecap> {
  const qs = new URLSearchParams({ lang: opts?.lang ?? "en" });
  if (opts?.refresh) qs.set("refresh", "1");
  return apiFetch<ChatRecap>(`${agenticBase(channel)}/recap/${encodeURIComponent(chatId)}?${qs.toString()}`);
}

export interface CatchupItem {
  chat_id: string;
  title: string;
  username: string | null;
  agent_count: number;
  customer_count: number;
  last_activity_at: string | null;
  last_preview: string;
  last_direction: "inbound" | "outbound" | null;
  escalations: number;
  paused: boolean;
  needs_attention: boolean;
  headline: string | null;
}

export interface CatchupData {
  since: string;
  totals: { chats: number; agent_messages: number; attention: number };
  items: CatchupItem[];
}

export async function getCatchup(channel: AgenticChannel = "telegram"): Promise<CatchupData> {
  return apiFetch<CatchupData>(`${agenticBase(channel)}/catchup`);
}

export async function markCatchupSeen(channel: AgenticChannel = "telegram"): Promise<{ ok: boolean }> {
  return apiFetch(`${agenticBase(channel)}/catchup/seen`, { method: "POST" });
}

export async function getCatchupSummary(
  channel: AgenticChannel = "telegram",
  lang = "en",
): Promise<{ summary: string }> {
  return apiFetch(`${agenticBase(channel)}/catchup/summary`, {
    method: "POST",
    body: { lang },
  });
}

export async function getTakeoverFollowup(
  chatId: string,
  channel: AgenticChannel = "telegram",
  lang = "en",
): Promise<{ text: string }> {
  return apiFetch(`${agenticBase(channel)}/takeover-followup/${encodeURIComponent(chatId)}?lang=${lang}`);
}
