"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  INITIAL_STREAMING_STATE,
  type ChatCard,
  type ChatMessage,
  type ChatModelId,
  type ChatSseEvent,
  type StreamingState,
} from "@/features/chat/types";
import { chatRunsApi, streamChatMessage } from "@/services/api/chat";
import type { AgenticChannel } from "@/services/api/agentic";

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface ChannelWorkspaceCopilotContext {
  channel: AgenticChannel;
  chatId: string;
  chatName: string;
  linkedLeadId?: string | null;
  leadColumn?: string | null;
}

function buildContextLine(ctx: ChannelWorkspaceCopilotContext): string {
  const label =
    ctx.channel === "telegram" ? "Telegram" : ctx.channel === "instagram" ? "Instagram" : ctx.channel;
  const lead =
    ctx.linkedLeadId != null
      ? `, linked lead id: ${ctx.linkedLeadId}${ctx.leadColumn ? ` (stage: ${ctx.leadColumn})` : ""}`
      : "";
  return `[${label} inbox context: chat "${ctx.chatName}" (id: ${ctx.chatId})${lead}]\n\n`;
}

/** Ephemeral workspace AI chat scoped to an inbox conversation — reuses the
 * same `/ai-chat/v2` SSE stream as the dashboard AI chat (`useChatController`)
 * but without thread persistence. Each customer chat gets its own local
 * history that resets when `chatId` changes. */
export function useChannelWorkspaceCopilot(
  workspaceId: string | null,
  context: ChannelWorkspaceCopilotContext | null,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [model, setModel] = useState<ChatModelId>("auto");
  const [streaming, setStreaming] = useState<StreamingState>(INITIAL_STREAMING_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef<StreamingState>(INITIAL_STREAMING_STATE);
  streamingRef.current = streaming;
  const contextRef = useRef(context);
  contextRef.current = context;

  const isSending = streaming.phase === "connecting" || streaming.phase === "streaming";

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStreaming(INITIAL_STREAMING_STATE);
  }, [context?.chatId, context?.channel]);

  const finalizeStream = useCallback(
    (final: { text: string; aiMsgId: string; stopped?: boolean; errorMessage?: string }) => {
      const snapshot = streamingRef.current;
      const aiMessage: ChatMessage = {
        id: final.aiMsgId,
        role: "ai",
        content: final.text,
        ts: Date.now(),
        cards: snapshot.cards.length ? snapshot.cards : undefined,
        steps: snapshot.steps.length ? snapshot.steps : undefined,
        plan: snapshot.plan ?? undefined,
        stopped: final.stopped,
        error: final.errorMessage ? { message: final.errorMessage } : null,
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    [],
  );

  const handleSseEvent = useCallback(
    (evt: ChatSseEvent) => {
      setStreaming((prev) => {
        switch (evt.event) {
          case "run":
            return { ...prev, phase: "streaming", runId: evt.data.runId, aiMsgId: evt.data.aiMsgId };
          case "meta":
            return { ...prev, meta: evt.data };
          case "plan":
            return { ...prev, plan: evt.data.text };
          case "step": {
            const steps = prev.steps.some((s) => s.id === evt.data.id)
              ? prev.steps.map((s) => (s.id === evt.data.id ? evt.data : s))
              : [...prev.steps, evt.data];
            return { ...prev, steps };
          }
          case "notice":
            return { ...prev, notices: [...prev.notices, evt.data.message] };
          case "card":
            return { ...prev, cards: [...prev.cards, evt.data as ChatCard] };
          case "token":
            return { ...prev, phase: "streaming", text: prev.text + evt.data.text };
          case "done": {
            finalizeStream({
              text: evt.data.text,
              aiMsgId: evt.data.aiMsgId,
              stopped: evt.data.stopped,
            });
            return { ...INITIAL_STREAMING_STATE, phase: evt.data.stopped ? "stopped" : "done" };
          }
          case "error": {
            finalizeStream({
              text: prev.text,
              aiMsgId: prev.aiMsgId ?? makeId(),
              errorMessage: evt.data.message,
            });
            return { ...INITIAL_STREAMING_STATE, phase: "error", errorMessage: evt.data.message };
          }
          default:
            return prev;
        }
      });
    },
    [finalizeStream],
  );

  const handleTransportError = useCallback((message: string) => {
    setStreaming((prev) => ({ ...prev, phase: "error", errorMessage: message }));
  }, []);

  const stop = useCallback(async () => {
    abortRef.current?.abort();
    const runId = streamingRef.current.runId;
    if (workspaceId && runId) {
      try {
        await chatRunsApi.stop(workspaceId, runId);
      } catch {
        // Client abort still stops listening.
      }
    }
    setStreaming((prev) => ({ ...prev, phase: "stopped" }));
  }, [workspaceId]);

  const send = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      const ctx = contextRef.current;
      if (!query || !workspaceId || !ctx || isSending) return;

      const userMessage: ChatMessage = { id: makeId(), role: "user", content: query, ts: Date.now() };
      const aiMsgId = makeId();
      setMessages((prev) => [...prev, userMessage]);

      const history = [...messages, userMessage]
        .slice(-15)
        .map((m) => ({
          role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming({ ...INITIAL_STREAMING_STATE, phase: "connecting", aiMsgId });

      await streamChatMessage(
        {
          query: `${buildContextLine(ctx)}${query}`,
          conversationHistory: history.slice(0, -1),
          model,
          aiMsgId,
          workspaceId,
        },
        { onEvent: handleSseEvent, onTransportError: handleTransportError },
        controller.signal,
      );
    },
    [workspaceId, isSending, messages, model, handleSseEvent, handleTransportError],
  );

  return {
    messages,
    streaming,
    isSending,
    model,
    setModel,
    send,
    stop,
  };
}
