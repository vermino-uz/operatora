import { env } from "@/config/env";
import { apiFetch, performTokenRefresh } from "@/services/api/client";
import { tokenStorage } from "@/services/api/token-storage";
import { ApiError } from "@/types/api";
import type {
  ActiveRunResponse,
  ChatModelId,
  ChatModelsResponse,
  ChatSseEvent,
  ThreadMessagePayload,
  ThreadRow,
} from "@/features/chat/types";

/** Every AI Chat endpoint is workspace-scoped by an explicit `workspace_id`
 * query param (unlike most of the rest of the API, which derives the
 * workspace from the JWT server-side) — this is the one deliberate
 * exception called out in the feature brief. */
function withWorkspace(path: string, workspaceId: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ workspace_id: workspaceId, ...extra });
  return `${path}?${params.toString()}`;
}

export const chatThreadsApi = {
  async list(workspaceId: string): Promise<ThreadRow[]> {
    return apiFetch<ThreadRow[]>(withWorkspace("/ai-chat/threads", workspaceId));
  },

  async create(
    workspaceId: string,
    body: { title?: string; messages?: ThreadMessagePayload[] },
  ): Promise<ThreadRow> {
    return apiFetch<ThreadRow>(withWorkspace("/ai-chat/threads", workspaceId), {
      method: "POST",
      body,
    });
  },

  async update(
    workspaceId: string,
    threadId: string,
    body: { title?: string; messages?: ThreadMessagePayload[] },
  ): Promise<ThreadRow> {
    return apiFetch<ThreadRow>(withWorkspace(`/ai-chat/threads/${threadId}`, workspaceId), {
      method: "PATCH",
      body,
    });
  },

  async appendMessage(
    workspaceId: string,
    threadId: string,
    message: ThreadMessagePayload,
  ): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(
      withWorkspace(`/ai-chat/threads/${threadId}/messages`, workspaceId),
      { method: "POST", body: { message } },
    );
  },

  async consumeChoice(
    workspaceId: string,
    threadId: string,
    messageId: string,
    cardIndex: number,
  ): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(
      withWorkspace(
        `/ai-chat/threads/${threadId}/messages/${messageId}/choices/${cardIndex}/consume`,
        workspaceId,
      ),
      { method: "POST" },
    );
  },

  async remove(workspaceId: string, threadId: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(withWorkspace(`/ai-chat/threads/${threadId}`, workspaceId), {
      method: "DELETE",
    });
  },
};

export const chatRunsApi = {
  async active(workspaceId: string, threadId: string): Promise<ActiveRunResponse> {
    return apiFetch<ActiveRunResponse>(
      withWorkspace("/ai-chat/runs/active", workspaceId, { threadId }),
    );
  },

  async stop(workspaceId: string, runId: string): Promise<{ ok: true }> {
    return apiFetch<{ ok: true }>(withWorkspace(`/ai-chat/runs/${runId}/stop`, workspaceId), {
      method: "POST",
    });
  },
};

export const chatMiscApi = {
  async feedback(params: { feedbackId: string; value: 1 | -1; workspaceId: string }): Promise<{ ok: boolean }> {
    return apiFetch<{ ok: boolean }>("/ai-chat/feedback", { method: "POST", body: params });
  },

  async models(workspaceId: string): Promise<ChatModelsResponse> {
    return apiFetch<ChatModelsResponse>(withWorkspace("/ai-chat/models", workspaceId));
  },
};

// --- SSE streaming --------------------------------------------------------------
// `apiFetch`/`rawRequest` buffer the whole response and JSON.parse it, so they
// can't be reused for a streamed `text/event-stream` body. This is a
// parallel, minimal request path that still shares the same auth/refresh
// mutex (`performTokenRefresh`) so a mid-stream 401 doesn't bypass the
// project's single-flight refresh rule.

export interface ChatStreamHandlers {
  onEvent: (event: ChatSseEvent) => void;
  /** Called for a transport-level failure (network drop, non-2xx before any
   * events arrived, etc.) — distinct from an in-stream `error` event, which
   * is passed to `onEvent` instead. */
  onTransportError: (message: string) => void;
}

function parseSseBlock(block: string): ChatSseEvent | null {
  let eventName: string | null = null;
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!eventName || dataLines.length === 0) return null;
  try {
    const data = JSON.parse(dataLines.join("\n"));
    return { event: eventName, data } as ChatSseEvent;
  } catch {
    return null;
  }
}

async function pumpSseStream(
  response: Response,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  if (!response.body) {
    handlers.onTransportError("No response body from server.");
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) {
        await reader.cancel().catch(() => undefined);
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const parsed = parseSseBlock(block);
        if (parsed) handlers.onEvent(parsed);
      }
    }
  } catch (err) {
    if (signal.aborted) return;
    handlers.onTransportError(err instanceof Error ? err.message : "Stream connection lost.");
  }
}

/** Performs an authorized streaming request, retrying once through the
 * shared refresh mutex on a 401 before giving up (mirrors `apiFetch`'s
 * retry behavior, since this path can't call `apiFetch` directly). */
async function authorizedStreamRequest(
  path: string,
  init: RequestInit,
  signal: AbortSignal,
): Promise<Response> {
  const attempt = async (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${env.apiBaseUrl}${path}`, { ...init, headers, signal });
  };

  let response = await attempt(tokenStorage.getAccessToken());
  if (response.status === 401) {
    const refreshed = await performTokenRefresh();
    if (refreshed) {
      response = await attempt(refreshed);
    }
  }
  return response;
}

export interface SendChatMessageParams {
  query: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Ignored when the plan uses a fixed feature model — backend clamps. */
  model?: ChatModelId;
  /** Which AI feature budget to charge (`ai_chat` default, `ai_ads_copilot` for Ads). */
  feature?: "ai_chat" | "ai_ads_copilot";
  language?: "uz" | "ru" | "en";
  threadId?: string;
  aiMsgId?: string;
  sourceMediaId?: string;
  workspaceId: string;
}

/** POST /ai-chat/v2 — starts a new streamed run. Abortable via `signal`
 * (wired to the composer's Stop button). */
export async function streamChatMessage(
  params: SendChatMessageParams,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await authorizedStreamRequest(
      "/ai-chat/v2",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          query: params.query,
          conversation_history: params.conversationHistory,
          model: params.model,
          feature: params.feature ?? "ai_chat",
          language: params.language,
          threadId: params.threadId,
          aiMsgId: params.aiMsgId,
          sourceMediaId: params.sourceMediaId,
          workspaceId: params.workspaceId,
        }),
      },
      signal,
    );
  } catch (err) {
    if (signal.aborted) return;
    handlers.onTransportError(err instanceof Error ? err.message : "Network error — check your connection.");
    return;
  }

  if (!response.ok) {
    const error = new ApiError({ statusCode: response.status, message: `Request failed (${response.status}).` });
    handlers.onTransportError(error.message);
    return;
  }

  await pumpSseStream(response, handlers, signal);
}

/** GET /ai-chat/runs/:id/events — reconnects to (and replays) an in-flight
 * run, used to resume a stream detected via `chatRunsApi.active` on mount or
 * thread switch instead of losing it to a stale "not sending" UI state. */
export async function streamRunEvents(
  runId: string,
  workspaceId: string,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await authorizedStreamRequest(
      withWorkspace(`/ai-chat/runs/${runId}/events`, workspaceId),
      { method: "GET", headers: { Accept: "text/event-stream" } },
      signal,
    );
  } catch (err) {
    if (signal.aborted) return;
    handlers.onTransportError(err instanceof Error ? err.message : "Network error — check your connection.");
    return;
  }

  if (!response.ok) {
    handlers.onTransportError(`Request failed (${response.status}).`);
    return;
  }

  await pumpSseStream(response, handlers, signal);
}
