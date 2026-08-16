"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { chatRunsApi, chatThreadsApi, streamChatMessage, streamRunEvents } from "@/services/api/chat";
import { chatThreadsQueryKey, useThreadsQuery } from "@/features/chat/hooks/useThreadsQuery";
import { useThreadMutations } from "@/features/chat/hooks/useThreadMutations";
import {
  INITIAL_STREAMING_STATE,
  type ChatCard,
  type ChatMessage,
  type ChatModelId,
  type ChatSseEvent,
  type ChatThread,
  type StreamingState,
} from "@/features/chat/types";

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function deriveTitle(query: string): string {
  const trimmed = query.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed || "New chat";
}

/** Patches one thread's `messages` array inside the cached threads list —
 * used for the hot "append a message while a stream is in flight" path so
 * the UI doesn't have to wait on a full list refetch. Falls back to a no-op
 * if the thread isn't in cache yet (rare: only right after creation, where
 * the create-thread mutation's own invalidation already covers it). */
function patchThreadMessages(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  threadId: string,
  updater: (messages: ChatMessage[]) => ChatMessage[],
) {
  queryClient.setQueryData<ChatThread[]>(chatThreadsQueryKey(workspaceId), (current) => {
    if (!current) return current;
    return current.map((thread) =>
      thread.id === threadId ? { ...thread, messages: updater(thread.messages) } : thread,
    );
  });
}

function upsertMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const idx = messages.findIndex((m) => m.id === message.id);
  if (idx === -1) return [...messages, message];
  const next = [...messages];
  next[idx] = message;
  return next;
}

export interface UseChatControllerOptions {
  workspaceId: string | null;
}

export function useChatController({ workspaceId }: UseChatControllerOptions) {
  const queryClient = useQueryClient();
  const threadsQuery = useThreadsQuery(workspaceId);
  const { createThread } = useThreadMutations(workspaceId);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [model, setModel] = useState<ChatModelId>("auto");
  const [streaming, setStreaming] = useState<StreamingState>(INITIAL_STREAMING_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef<StreamingState>(INITIAL_STREAMING_STATE);
  streamingRef.current = streaming;
  // Mirrors `activeThreadId` synchronously (state updates are deferred to
  // the next render, but `finalizeStream`/`send` below need the *just
  // created* thread id immediately, within the same async call — e.g. right
  // after creating a brand-new thread, before React has re-rendered).
  const activeThreadIdRef = useRef<string | null>(null);

  const threadsData = threadsQuery.data;
  const threads = useMemo(() => threadsData ?? [], [threadsData]);
  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId),
    [threads, activeThreadId],
  );

  const isSending = streaming.phase === "connecting" || streaming.phase === "streaming";

  const setActiveThread = useCallback((threadId: string | null) => {
    activeThreadIdRef.current = threadId;
    setActiveThreadId(threadId);
  }, []);

  const selectThread = useCallback(
    (threadId: string | null) => {
      // Switching threads abandons any local (unsent) streaming overlay for
      // the previous thread — the SSE connection itself is aborted so it
      // doesn't keep updating state for a thread that's no longer shown.
      abortRef.current?.abort();
      setStreaming(INITIAL_STREAMING_STATE);
      setActiveThread(threadId);
    },
    [setActiveThread],
  );

  const startNewThread = useCallback(() => selectThread(null), [selectThread]);

  // --- Resume an in-flight run on mount / thread switch --------------------
  useEffect(() => {
    if (!workspaceId || !activeThreadId) return;
    let cancelled = false;

    (async () => {
      try {
        const { run } = await chatRunsApi.active(workspaceId, activeThreadId);
        if (cancelled || !run) return;

        const controller = new AbortController();
        abortRef.current = controller;
        setStreaming({ ...INITIAL_STREAMING_STATE, phase: "connecting", runId: run.id, aiMsgId: run.aiMsgId });

        await streamRunEvents(run.id, workspaceId, { onEvent: handleSseEvent, onTransportError: handleTransportError }, controller.signal);
      } catch {
        // No active run, or the lookup failed — fine, just show the thread
        // as-is; the user can still send a new message.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, activeThreadId]);

  const finalizeStream = useCallback(
    (final: { text: string; aiMsgId: string; stopped?: boolean; persisted?: boolean; errorMessage?: string }) => {
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

      const threadId = activeThreadIdRef.current;
      if (workspaceId && threadId) {
        patchThreadMessages(queryClient, workspaceId, threadId, (messages) =>
          upsertMessage(messages, aiMessage),
        );
        // `persisted: true` means the server already wrote this AI message —
        // appending it again would duplicate it (see feature brief). Only
        // persist client-side when the server didn't (e.g. a stopped/errored
        // run that never reached its own persistence step, if it has
        // anything worth keeping).
        if (!final.persisted && final.text) {
          chatThreadsApi.appendMessage(workspaceId, threadId, aiMessage).catch(() => {
            // Best-effort — the message still renders locally via the cache
            // patch above; a refetch will reconcile if this silently failed.
          });
        }
      }
    },
    [workspaceId, queryClient],
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
              persisted: evt.data.persisted,
            });
            return { ...INITIAL_STREAMING_STATE, phase: evt.data.stopped ? "stopped" : "done" };
          }
          case "error": {
            finalizeStream({
              text: prev.text,
              aiMsgId: prev.aiMsgId ?? makeId(),
              errorMessage: evt.data.message,
              persisted: false,
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
        // Cooperative stop — if the request itself fails, the abort() above
        // still stops the client from listening; nothing more to do here.
      }
    }
    setStreaming((prev) => ({ ...prev, phase: "stopped" }));
  }, [workspaceId]);

  const send = useCallback(
    async (rawQuery: string, sourceMediaId?: string) => {
      const query = rawQuery.trim();
      if (!query || !workspaceId || isSending) return;

      const userMessage: ChatMessage = { id: makeId(), role: "user", content: query, ts: Date.now() };
      const aiMsgId = makeId();

      let threadId = activeThreadId;
      let historyMessages: ChatMessage[] = activeThread?.messages ?? [];

      try {
        if (!threadId) {
          const created = await createThread.mutateAsync({ title: deriveTitle(query), messages: [userMessage] });
          threadId = created.id;
          historyMessages = created.messages;
          setActiveThread(threadId);
        } else {
          await chatThreadsApi.appendMessage(workspaceId, threadId, userMessage);
          patchThreadMessages(queryClient, workspaceId, threadId, (messages) => upsertMessage(messages, userMessage));
          historyMessages = [...historyMessages, userMessage];
        }
      } catch (err) {
        setStreaming((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: err instanceof Error ? err.message : "Failed to send message.",
        }));
        return;
      }

      const conversationHistory = historyMessages
        .slice(-15)
        .map((m) => ({ role: m.role === "ai" ? ("assistant" as const) : ("user" as const), content: m.content }));

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming({ ...INITIAL_STREAMING_STATE, phase: "connecting", aiMsgId });

      await streamChatMessage(
        {
          query,
          conversationHistory,
          model,
          threadId,
          aiMsgId,
          sourceMediaId,
          workspaceId,
        },
        { onEvent: handleSseEvent, onTransportError: handleTransportError },
        controller.signal,
      );
    },
    [
      workspaceId,
      isSending,
      activeThreadId,
      activeThread,
      createThread,
      queryClient,
      model,
      handleSseEvent,
      handleTransportError,
      setActiveThread,
    ],
  );

  const messages = activeThread?.messages ?? [];

  return {
    threads,
    threadsQuery,
    activeThreadId,
    activeThread,
    selectThread,
    startNewThread,
    messages,
    streaming,
    isSending,
    send,
    stop,
    model,
    setModel,
  };
}
