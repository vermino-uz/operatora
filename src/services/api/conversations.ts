import { env } from "@/config/env";
import { apiFetch, performTokenRefresh } from "@/services/api/client";
import { normalizePaginated } from "@/services/api/pagination";
import { tokenStorage } from "@/services/api/token-storage";
import { ApiError } from "@/types/api";
import type { Paginated } from "@/types/api";
import type {
  Conversation,
  ConversationAiAssistantResponse,
  ConversationListParams,
} from "@/features/conversations/types";

/** `GET /api/conversation` is a confirmed exception to "the backend always
 * derives workspace from the JWT alone" (same pattern the AI Chat feature
 * established in `services/api/chat.ts`) — omitting `workspace_id` unions
 * results across every workspace the caller belongs to. */
function buildListPath(workspaceId: string, params: ConversationListParams): string {
  const q = new URLSearchParams({ workspace_id: workspaceId });
  q.set("offset", String(params.offset));
  q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.operator && params.operator !== "all") q.set("operator", params.operator);
  if (params.fromDate) q.set("from_date", params.fromDate);
  if (params.toDate) q.set("to_date", params.toDate);
  if (params.minScore !== undefined) q.set("min_score", String(params.minScore));
  if (params.maxScore !== undefined) q.set("max_score", String(params.maxScore));
  return `/conversation?${q.toString()}`;
}

export const conversationsApi = {
  async list(workspaceId: string, params: ConversationListParams): Promise<Paginated<Conversation>> {
    const raw = await apiFetch<unknown>(buildListPath(workspaceId, params));
    return normalizePaginated<Conversation>(raw, {
      itemsKey: "data",
      totalKey: "count",
      page: Math.floor(params.offset / params.limit) + 1,
      pageSize: params.limit,
    });
  },

  async get(id: string): Promise<Conversation> {
    return apiFetch<Conversation>(`/conversation/${id}`);
  },
};

// --- Audio playback/download — binary proxy, not a signed URL -------------
// `GET /api/play-back/:conversationId` streams raw audio bytes; can't go
// through `apiFetch` (JSON-only). Mirrors the auth-attach + single-flight
// refresh pattern `services/api/chat.ts` uses for its SSE streaming path.

async function authorizedBinaryRequest(path: string): Promise<Response> {
  const attempt = async (token: string | null): Promise<Response> => {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${env.apiBaseUrl}${path}`, { headers });
  };

  let response = await attempt(tokenStorage.getAccessToken());
  if (response.status === 401) {
    const refreshed = await performTokenRefresh();
    if (refreshed) response = await attempt(refreshed);
  }
  if (!response.ok) {
    throw new ApiError({
      statusCode: response.status,
      message: `Could not load audio (${response.status}).`,
    });
  }
  return response;
}

/** No `Range` header support is confirmed on this endpoint — scrubbing on
 * large files may not be smooth. `download: true` appends `?download=1`
 * so the backend sets `Content-Disposition: attachment` instead of
 * `inline`, but the returned bytes are identical either way — callers
 * decide what to do with the blob (object URL for playback, or a
 * synthetic `<a download>` click). */
export async function getConversationAudioBlob(
  conversationId: string,
  opts: { download?: boolean } = {},
): Promise<Blob> {
  const qs = opts.download ? "?download=1" : "";
  const response = await authorizedBinaryRequest(`/play-back/${conversationId}${qs}`);
  return response.blob();
}

// --- AI assistant — chat about a single conversation -----------------------
// POST /api/fn/conversation-ai-assistant. Traced to
// `FunctionsController.dispatch('conversation-ai-assistant')` ->
// `FunctionsHandlersService.aiChatHandler('conversation', body, user)` ->
// `AiChatService.chat()` (`app/backend/src/ai-ext/handlers/ai-chat.service.ts`,
// read-only reference at /www/wwwroot/dev.operatora — never modified).
// Confirmed: plain JSON request/response, NOT SSE (unlike the AI Chat
// feature's `/ai-chat/v2`) — the handler awaits `AiChatService.chat()` and
// the controller returns its result synchronously as one JSON body:
// `{ reply: string; threadId?: string; model: string }`.
//
// Request body fields read server-side (`ChatRequest` in the same file):
// `message`, `conversation` (a free-form context object — the handler's
// `buildConversationContextBlock()` reads `client_name`, `operator_name`,
// `conversation_date`/`conversation_time`, `duration`/`duration_sec`,
// `ai_score`, `sentiment`, `status`, `summary`, `key_points`, `transcript`),
// `chatHistory` (`{type: 'user'|'assistant', content}[]`), `threadId`,
// `workspaceId`, `model`. `chatMode` is set server-side to `'conversation'`
// by the dispatch table — the client never sends it.
export interface ConversationAiAssistantRequest {
  message: string;
  conversation: Record<string, unknown>;
  chatHistory: Array<{ type: "user" | "assistant"; content: string }>;
  threadId?: string;
  workspaceId?: string;
}

export const conversationAiAssistantApi = {
  async send(body: ConversationAiAssistantRequest): Promise<ConversationAiAssistantResponse> {
    return apiFetch<ConversationAiAssistantResponse>("/fn/conversation-ai-assistant", {
      method: "POST",
      body,
    });
  },
};
