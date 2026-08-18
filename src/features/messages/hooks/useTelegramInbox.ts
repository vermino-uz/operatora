"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { telegramChatsApi, telegramMessagesApi } from "@/services/api/telegramMessages";
import { subscribeToTelegramEvents } from "@/services/realtime/subscriptions";
import type { TelegramChat, TelegramMessage } from "@/features/messages/types";

const CHATS_KEY = (workspaceId: string) => ["telegram-chats", workspaceId] as const;
const MESSAGES_KEY = (chatId: string) => ["telegram-messages", chatId] as const;
const INVALIDATE_DEBOUNCE_MS = 800;

export function useTelegramChatsQuery(workspaceId: string | null, search: string) {
  return useQuery({
    queryKey: workspaceId ? [...CHATS_KEY(workspaceId), search] : ["telegram-chats-disabled"],
    queryFn: () => telegramChatsApi.list({ workspaceId: workspaceId as string, limit: 100, search: search || undefined }),
    enabled: Boolean(workspaceId),
    staleTime: 15_000,
  });
}

export function useTelegramMessagesQuery(chatId: string | null) {
  return useQuery({
    queryKey: chatId ? MESSAGES_KEY(chatId) : ["telegram-messages-disabled"],
    queryFn: () => telegramMessagesApi.list(chatId as string),
    enabled: Boolean(chatId),
    staleTime: 5_000,
  });
}

/** Optimistic send: the composer must show the operator's own message the
 * instant they hit send, not only once a round-trip confirms it (chat UX
 * baseline, and what was actually missing — the API's 2xx response body
 * for `/telegram-meassages/send` is empty, so there was nothing to append
 * without this). A temp `optimistic-*` bubble is inserted immediately
 * (`status: "pending"`), then reconciled: replaced by the real row if the
 * response ever includes one, marked `"sent"` and left for the realtime
 * subscription / a refetch to reconcile otherwise, or marked `"failed"`
 * (never silently dropped) if the request errors. */
export function useTelegramSendMutation(chatId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => telegramMessagesApi.send({ chatId: chatId as string, text }),
    onMutate: (text) => {
      if (!chatId) return {};
      const tempId = `optimistic-${crypto.randomUUID()}`;
      const optimistic: TelegramMessage = {
        id: tempId,
        chat_id: chatId,
        direction: "outbound",
        text_content: text,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<TelegramMessage[]>(MESSAGES_KEY(chatId), (prev) => (prev ? [...prev, optimistic] : [optimistic]));
      return { tempId };
    },
    onSuccess: (message, _text, context) => {
      if (!chatId) return;
      const tempId = context?.tempId;
      queryClient.setQueryData<TelegramMessage[]>(MESSAGES_KEY(chatId), (prev) =>
        prev?.map((m) => (m.id === tempId ? (message ?? { ...m, status: "sent" }) : m)),
      );
      // Deliberately no invalidate/refetch here even when the response body
      // is empty: an immediate refetch can race the backend's own write
      // (server list doesn't have the row yet) and wholesale-replace the
      // cache, wiping the bubble we just showed — exactly the "message
      // disappears" bug this replaced. Reconciliation instead happens via
      // `useTelegramRealtime`'s `onNewMessage`, which swaps this temp
      // bubble for the authoritative row once the socket delivers it.
    },
    onError: (_err, _text, context) => {
      if (!chatId || !context?.tempId) return;
      const tempId = context.tempId;
      queryClient.setQueryData<TelegramMessage[]>(MESSAGES_KEY(chatId), (prev) =>
        prev?.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
      );
    },
  });
}

export function useTelegramMarkReadMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => telegramChatsApi.markRead(chatId, workspaceId as string),
    onSuccess: () => {
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: CHATS_KEY(workspaceId) });
    },
  });
}

export function useTelegramLinkLeadMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { chatId: string; leadId: string | null }) =>
      telegramChatsApi.linkLead(params.chatId, workspaceId as string, params.leadId),
    onSuccess: () => {
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: CHATS_KEY(workspaceId) });
    },
  });
}

/** Wires the Telegram socket events (see `subscriptions.ts`) into the
 * React Query cache: new messages for the currently open chat are appended
 * directly (no round-trip refetch), everything else (list previews/unread
 * counts/other-chat activity) triggers one debounced chat-list refetch. */
export function useTelegramRealtime(workspaceId: string | null, selectedChatId: string | null) {
  const queryClient = useQueryClient();
  const selectedChatIdRef = useRef(selectedChatId);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    if (!workspaceId) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleListInvalidate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void queryClient.invalidateQueries({ queryKey: ["telegram-chats", workspaceId] });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeToTelegramEvents({
      onNewMessage: (row) => {
        const chatId = typeof row.chat_id === "string" ? row.chat_id : undefined;
        if (chatId && chatId === selectedChatIdRef.current) {
          queryClient.setQueryData<TelegramMessage[]>(MESSAGES_KEY(chatId), (prev) => {
            const message = row as unknown as TelegramMessage;
            if (!prev) return [message];
            if (prev.some((m) => m.id === message.id)) return prev;
            // Reconcile our own optimistic bubble (see
            // `useTelegramSendMutation`) with the authoritative echo
            // instead of appending a duplicate.
            if (message.direction === "outbound") {
              const tempIndex = prev.findIndex((m) => m.id.startsWith("optimistic-") && m.text_content === message.text_content);
              if (tempIndex !== -1) {
                const next = [...prev];
                next[tempIndex] = message;
                return next;
              }
            }
            return [...prev, message];
          });
        }
        scheduleListInvalidate();
      },
      onChatUpdated: () => scheduleListInvalidate(),
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [workspaceId, queryClient]);
}

export type { TelegramChat };
