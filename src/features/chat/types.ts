/**
 * Domain types for the AI Chat feature ("/dashboard"). Hand-written from the
 * real backend contract (see the Phase 2b brief / PROGRESS.md) — NOT copied
 * from the HeroUI Pro template's `data/chat.ts` mock types, which model a
 * different (client-only, non-persisted) shape.
 */

// --- Core message/thread shapes -------------------------------------------------

export type ChatRole = "user" | "ai";

export interface AgentStepInfo {
  id: string;
  tool: string;
  status: "running" | "done" | "error";
  durationMs?: number;
  detail?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string; // markdown
  ts: number; // ms epoch
  sourceMediaId?: string;
  cards?: ChatCard[];
  error?: { message: string } | null;
  steps?: AgentStepInfo[];
  plan?: string;
  stopped?: boolean;
}

/** Wire payload for appending/creating messages — same shape as `ChatMessage`,
 * named separately so intent at each call site is clear (payload vs. stored). */
export type ThreadMessagePayload = ChatMessage;

/** Raw row shape from `/ai-chat/threads`. `messages` is untyped JSONB on the
 * backend — always run it through `parseThreadMessages` before use. */
export interface ThreadRow {
  id: string;
  workspace_id: string;
  title: string;
  messages: unknown;
  created_at: string;
  updated_at: string;
}

/** Client-side convenience shape: a `ThreadRow` with `messages` narrowed to
 * `ChatMessage[]`. Never persisted as-is — only used in memory/UI. */
export interface ChatThread extends Omit<ThreadRow, "messages"> {
  messages: ChatMessage[];
}

// --- Card union — discriminant is `kind` -----------------------------------------

export interface LeadCardPayload {
  id: string;
  name: string;
  phone: string;
  status: string;
  statusColor: string;
  operator: string;
  createdAt: string;
  section?: string;
  totalCalls?: number;
  totalMessages?: number;
}

export interface ConversationCardPayload {
  id: string;
  clientName: string;
  clientPhone?: string;
  operatorName: string;
  aiScore: number;
  status: string;
  durationSec: number;
  summary: string;
  hasAudio?: boolean;
}

export interface TranscriptTurn {
  role: "operator" | "client";
  speaker: string;
  timestamp?: string;
  text: string;
  highlight?: boolean;
}

export interface AudioCardPayload {
  conversationId: string;
  label: string;
  subLabel?: string;
  durationSec?: number;
  hasAudio?: boolean;
}

export interface GeneratedImageCardPayload {
  id: string;
  url: string;
  prompt: string;
  model?: string;
  mediaKind?: "image" | "video";
  aspectRatio?: string;
  duration?: number;
  hasAudio?: boolean;
}

export interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
}

export interface ChoiceRequestPayload {
  title: string;
  options?: ChoiceOption[];
  groups?: unknown;
  replyTemplate?: string;
  sourceMediaId?: string;
  consumed?: boolean;
}

export interface ActionRequiredPayload {
  action: string;
  title: string;
  message: string;
  configType: "eskiz" | "sip" | "telegram" | "instagram" | "generic";
  settingsTarget?: string;
  actionLabel?: string;
}

export interface FeatureUnavailablePayload {
  feature: string;
  title: string;
  message: string;
}

export interface ThemeTogglePayload {
  title: string;
  description: string;
  intent?: "dark" | "light";
}

// Deferred/read-only card payloads — shapes kept loose (`Record<string, unknown>`
// style optional fields) since only informational fields are rendered; no
// write/confirm endpoint has been traced for these (see card components for
// the full explanation, mirrored from the feature brief).
export interface AutomationFlowPayload {
  title?: string;
  description?: string;
  [key: string]: unknown;
}
export interface TaskProposalPayload {
  title?: string;
  description?: string;
  [key: string]: unknown;
}
export interface MeetingProposalPayload {
  title?: string;
  description?: string;
  [key: string]: unknown;
}
export interface SuperAgentTaskPayload {
  title?: string;
  status?: string;
  [key: string]: unknown;
}
export interface SuperAgentQuestionPayload {
  question?: string;
  [key: string]: unknown;
}
export interface SmsComposePayload {
  templates?: Array<{ id?: string; label?: string; text: string }>;
  [key: string]: unknown;
}
export interface HiggsfieldConnectPayload {
  title?: string;
  message?: string;
  registerUrl?: string;
  [key: string]: unknown;
}

export type ChatCard =
  | { kind: "lead"; lead: LeadCardPayload }
  | { kind: "leads"; leads: LeadCardPayload[] }
  | { kind: "conversation"; conversation: ConversationCardPayload }
  | { kind: "conversations"; conversations: ConversationCardPayload[] }
  | {
      kind: "transcript";
      transcript: {
        conversationId: string;
        durationLabel?: string;
        dateLabel?: string;
        turns: TranscriptTurn[];
        keyMomentsCount?: number;
      };
    }
  | { kind: "audio"; audio: AudioCardPayload }
  | { kind: "generated_image"; generatedImage: GeneratedImageCardPayload }
  | { kind: "choice_request"; choiceRequest: ChoiceRequestPayload }
  | { kind: "action_required"; actionRequired: ActionRequiredPayload }
  | { kind: "feature_unavailable"; featureUnavailable: FeatureUnavailablePayload }
  | { kind: "theme_toggle"; themeToggle: ThemeTogglePayload }
  | { kind: "automation_flow"; automationFlow: AutomationFlowPayload }
  | { kind: "task_proposal"; taskProposal: TaskProposalPayload }
  | { kind: "meeting_proposal"; meetingProposal: MeetingProposalPayload }
  | { kind: "super_agent_task"; superAgentTask: SuperAgentTaskPayload }
  | { kind: "super_agent_question"; superAgentQuestion: SuperAgentQuestionPayload }
  | { kind: "sms_compose"; smsCompose: SmsComposePayload }
  | { kind: "higgsfield_connect"; higgsfieldConnect: HiggsfieldConnectPayload };

export type ChatCardKind = ChatCard["kind"];

// --- Models ------------------------------------------------------------------

export type ChatModelId = "auto" | "claude-sonnet" | "claude-opus" | "gemini" | "local";
export type ChatLanguage = "uz" | "ru" | "en";

export interface ChatModelOverride {
  id: string;
  label?: string;
  name?: string;
  [key: string]: unknown;
}

export interface ChatModelsResponse {
  planSlug: string;
  planName: string;
  allowed: ChatModelOverride[];
}

// --- SSE event vocabulary (POST /ai-chat/v2 and GET /ai-chat/runs/:id/events) ---

export interface SseRunEvent {
  runId: string;
  aiMsgId: string;
}
export interface SseMetaEvent {
  model?: string;
  provider?: string;
  intent?: string;
  complexity?: string;
  cached?: boolean;
  leadCount?: number;
  manualModel?: string;
}
export interface SsePlanEvent {
  text: string;
}
export interface SseStepEvent {
  id: string;
  tool: string;
  status: "running" | "done" | "error";
  durationMs?: number;
  detail?: string;
}
export interface SseNoticeEvent {
  message: string;
}
export interface SseTokenEvent {
  text: string;
}
export interface SseDoneEvent {
  text: string;
  model?: string;
  provider?: string;
  path?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  fallback?: boolean;
  feedbackId?: string;
  aiMsgId: string;
  stopped?: boolean;
  persisted?: boolean;
}
export interface SseErrorEvent {
  message: string;
  code?: string;
}

export type ChatSseEvent =
  | { event: "run"; data: SseRunEvent }
  | { event: "meta"; data: SseMetaEvent }
  | { event: "plan"; data: SsePlanEvent }
  | { event: "step"; data: SseStepEvent }
  | { event: "notice"; data: SseNoticeEvent }
  | { event: "card"; data: ChatCard }
  | { event: "token"; data: SseTokenEvent }
  | { event: "done"; data: SseDoneEvent }
  | { event: "error"; data: SseErrorEvent };

// --- Runs ----------------------------------------------------------------------

export interface ActiveRun {
  id: string;
  aiMsgId: string;
  status: string;
  startedAt: string;
}

export interface ActiveRunResponse {
  run: ActiveRun | null;
}

// --- Local (non-persisted) streaming UI state -----------------------------------

export type StreamPhase = "idle" | "connecting" | "streaming" | "done" | "stopped" | "error";

export interface StreamingState {
  phase: StreamPhase;
  aiMsgId: string | null;
  runId: string | null;
  text: string;
  plan: string | null;
  notices: string[];
  steps: AgentStepInfo[];
  cards: ChatCard[];
  meta: SseMetaEvent | null;
  errorMessage: string | null;
}

export const INITIAL_STREAMING_STATE: StreamingState = {
  phase: "idle",
  aiMsgId: null,
  runId: null,
  text: "",
  plan: null,
  notices: [],
  steps: [],
  cards: [],
  meta: null,
  errorMessage: null,
};

/** Narrows a raw `ThreadRow.messages` JSONB value into `ChatMessage[]`,
 * tolerating anything malformed/missing rather than throwing — a bad row
 * should never crash the whole thread list. */
export function parseThreadMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is ChatMessage => {
    return (
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === "string" &&
      ((item as Record<string, unknown>).role === "user" ||
        (item as Record<string, unknown>).role === "ai")
    );
  });
}

export function toChatThread(row: ThreadRow): ChatThread {
  return { ...row, messages: parseThreadMessages(row.messages) };
}
