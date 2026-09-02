/**
 * Domain types for the Conversations feature (`/conversations`). Hand-written
 * from the real `GET /api/conversation`, `GET /api/conversation/:id`, and
 * `GET /api/play-back/:id` backend contract (see the feature brief /
 * PROGRESS.md Phase 2b). Deliberately NOT reusing `features/chat/types.ts`'s
 * `ConversationCardPayload` — that's a much smaller, chat-card-shaped
 * projection, not the full row.
 *
 * Trimmed to the fields explicitly listed in the brief plus what's actually
 * rendered — `entities` (the out-of-scope lead-linking mechanism) is kept as
 * `unknown` and never rendered.
 */

export interface Conversation {
  id: string;
  operator_name: string;
  operator_avatar?: string | null;
  client_name: string;
  client_phone?: string | null;
  conversation_date: string;
  conversation_time: string;
  duration?: string | null;
  duration_sec?: number | null;
  ai_score?: number | null;
  status?: string | null;
  tags: string[];
  summary?: string | null;
  sentiment?: string | null;
  sentiment_score?: number | null;
  key_moments: string[] | null;
  key_points: string[] | null;
  topics: string[] | null;
  entities?: unknown;
  compliance_flags: string[] | null;
  risks: string[] | null;
  opportunities: string[] | null;
  disposition?: string | null;
  follow_up_actions: string[] | null;
  evaluation_criteria?: unknown;
  strengths: string[] | null;
  improvements: string[] | null;
  language?: string | null;
  transcript?: unknown;
  word_count?: number | null;
  wpm?: number | null;
  audio_file_path?: string | null;
  audio_file_size?: number | null;
  created_at: string;
  updated_at: string;
  source?: string | null;
}

/** Server-supported list filters — deliberately limited to exactly what
 * `GET /api/conversation` accepts (see brief). No `channel`/`sentiment`
 * params exist server-side, so they're not modeled here — filtering by
 * those would only work within the current page and would misleadingly
 * look like a real filter. */
export interface ConversationListFilters {
  search?: string;
  status?: string;
  operator?: string;
  fromDate?: string;
  toDate?: string;
  minScore?: number;
  maxScore?: number;
}

export interface ConversationListParams extends ConversationListFilters {
  offset: number;
  limit: number;
}

// --- Normalized transcript turn (parsed from the raw `unknown` JSON field) ---

export interface ConversationTranscriptTurn {
  side: "operator" | "client";
  speaker: string;
  text: string;
  timestamp?: string;
}

/** Narrows `Conversation.transcript` (raw `unknown` JSONB) into either a
 * parsed turn-by-turn array, or a raw-string fallback when the shape isn't
 * an array of turn objects — never throws. */
export function parseTranscript(
  raw: unknown,
): { kind: "turns"; turns: ConversationTranscriptTurn[] } | { kind: "raw"; text: string } | { kind: "empty" } {
  if (raw === null || raw === undefined) return { kind: "empty" };

  if (Array.isArray(raw)) {
    const turns: ConversationTranscriptTurn[] = raw.map((entry, index) => {
      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        const speakerRaw = typeof obj.speaker === "string" ? obj.speaker : "";
        const text =
          typeof obj.text === "string"
            ? obj.text
            : typeof obj.content === "string"
              ? obj.content
              : "";
        const timestamp = typeof obj.timestamp === "string" ? obj.timestamp : undefined;
        const lower = speakerRaw.toLowerCase();
        let side: "operator" | "client";
        if (lower.includes("operator")) side = "operator";
        else if (lower.includes("client")) side = "client";
        else side = index % 2 === 0 ? "operator" : "client";
        return { side, speaker: speakerRaw || (side === "operator" ? "Operator" : "Client"), text, timestamp };
      }
      return {
        side: index % 2 === 0 ? "operator" : "client",
        speaker: index % 2 === 0 ? "Operator" : "Client",
        text: String(entry),
      };
    });
    return { kind: "turns", turns };
  }

  return { kind: "raw", text: String(raw) };
}

// --- Evaluation criteria — either an array of {name, score, feedback|note}
// or an object map {criterionName: value}. Handle both shapes. -------------

export interface EvaluationCriterionEntry {
  name: string;
  score?: number | string;
  feedback?: string;
}

export function parseEvaluationCriteria(raw: unknown): EvaluationCriterionEntry[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "Criterion",
        score:
          typeof item.score === "number" || typeof item.score === "string" ? item.score : undefined,
        feedback:
          typeof item.feedback === "string"
            ? item.feedback
            : typeof item.note === "string"
              ? item.note
              : undefined,
      }));
  }

  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([name, value]) => ({
      name,
      score:
        typeof value === "number" || typeof value === "string" ? value : undefined,
      feedback:
        value && typeof value === "object" && !Array.isArray(value)
          ? (() => {
              const v = value as Record<string, unknown>;
              return typeof v.feedback === "string" ? v.feedback : typeof v.note === "string" ? v.note : undefined;
            })()
          : undefined,
    }));
  }

  return [];
}

// --- AI assistant (chat about this conversation) --------------------------

export interface ConversationAssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface ConversationAiAssistantResponse {
  reply: string;
  threadId?: string;
  model: string;
}
