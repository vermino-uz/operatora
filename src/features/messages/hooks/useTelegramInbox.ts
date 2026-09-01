"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { telegramChatsApi, telegramMessagesApi } from "@/services/api/telegramMessages";
import { subscribeToTelegramEvents } from "@/services/realtime/subscriptions";
import type { TelegramChat, TelegramMessage } from "@/features/messages/types";

const BUSINESS_BOT_CHAT_PAGE_SIZE = 50;
/** Linked-account inboxes are large — load 500 up front (backend max per request). */
const USER_ACCOUNT_CHAT_PAGE_SIZE = 500;
const CHATS_KEY = (workspaceId: string, mode: string) => ["telegram-chats", workspaceId, mode] as const;
const MESSAGES_KEY = (chatId: string) => ["telegram-messages", chatId] as const;
const INVALIDATE_DEBOUNCE_MS = 800;
/** Linked-account mode prefetches 500 chats per page — keep scrolling past that threshold. */
export const USER_ACCOUNT_CHAT_PREFETCH_TARGET = 500;
/** Pull this many messages from Telegram when a linked-account chat is opened. */
export const CHAT_OPEN_HISTORY_SYNC_LIMIT = 100;

export function useTelegramChatsQuery(
  workspaceId: string | null,
  search: string,
  mode: "business_bot" | "user_account" = "business_bot",
) {
  const pageSize = mode === "user_account" ? USER_ACCOUNT_CHAT_PAGE_SIZE : BUSINESS_BOT_CHAT_PAGE_SIZE;
  const query = useInfiniteQuery({
    queryKey: workspaceId ? [...CHATS_KEY(workspaceId, mode), search] : ["telegram-chats-disabled"],
    queryFn: ({ pageParam = 0 }) =>
      telegramChatsApi.list({
        workspaceId: workspaceId as string,
        limit: pageSize,
        offset: pageParam,
        search: search || undefined,
        mode,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length < pageSize ? undefined : lastPageParam + pageSize,
    enabled: Boolean(workspaceId),
    staleTime: 15_000,
  });

  const chats = query.data?.pages.flat() ?? [];

  return {
    ...query,
    chats,
  };
}

export function useTelegramSyncHistoryMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { chatId: string; offsetId?: number; limit?: number; forumTopicId?: number }) =>
      telegramChatsApi.syncHistory(params.chatId, workspaceId as string, {
        offsetId: params.offsetId,
        limit: params.limit,
        forumTopicId: params.forumTopicId,
      }),
    onSuccess: (_data, params) => {
      void queryClient.invalidateQueries({ queryKey: MESSAGES_KEY(params.chatId) });
    },
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

export interface TelegramSendParams {
  text: string;
  senderId?: string;
  /** Telegram's own numeric message id being replied to (not our row uuid). */
  replyToMessageId?: number | null;
  /** Forum topic to post into (TDLib supergroups with topics enabled). */
  forumTopicId?: number;
  /** Optimistic reply-quote strip shown on the temp bubble immediately —
   * reconciled with the server's own `metadata.reply_preview` on success. */
  replyPreview?: { author: string; text: string } | null;
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
    mutationFn: (params: TelegramSendParams) =>
      telegramMessagesApi.send({
        chatId: chatId as string,
        text: params.text,
        senderId: params.senderId,
        replyToMessageId: params.replyToMessageId,
        forumTopicId: params.forumTopicId,
      }),
    onMutate: (params) => {
      if (!chatId) return {};
      const tempId = `optimistic-${crypto.randomUUID()}`;
      const optimistic: TelegramMessage = {
        id: tempId,
        chat_id: chatId,
        direction: "outbound",
        text_content: params.text,
        message_kind: "text",
        status: "pending",
        created_at: new Date().toISOString(),
        sender_id: params.senderId,
        reply_to_message_id: params.replyToMessageId ?? null,
        metadata: params.replyPreview ? { reply_preview: params.replyPreview } : undefined,
      };
      queryClient.setQueryData<TelegramMessage[]>(MESSAGES_KEY(chatId), (prev) => (prev ? [...prev, optimistic] : [optimistic]));
      return { tempId };
    },
    onSuccess: (message, _params, context) => {
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
    onError: (_err, _params, context) => {
      if (!chatId || !context?.tempId) return;
      const tempId = context.tempId;
      queryClient.setQueryData<TelegramMessage[]>(MESSAGES_KEY(chatId), (prev) =>
        prev?.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
      );
    },
  });
}

/** Optimistic set/remove of the operator's own quick-reaction — the
 * response body already carries the updated message, but this pass
 * updates the cache directly on success (mirrors the old panel's own
 * `setMessages` patch) rather than invalidating, since a full refetch of
 * an open thread on every reaction click would be wasteful. */
export function useTelegramReactionMutation(chatId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { messageId: string; emoji: string | null }) =>
      telegramMessagesApi.react(params.messageId, params.emoji),
    onSuccess: (updated, params) => {
      if (!chatId) return;
      queryClient.setQueryData<TelegramMessage[]>(MESSAGES_KEY(chatId), (prev) =>
        prev?.map((m) =>
          m.id === params.messageId
            ? { ...m, metadata: { ...(m.metadata ?? {}), operator_reaction: params.emoji, ...(updated?.metadata ?? {}) } }
            : m,
        ),
      );
    },
  });
}

/** `POST :id/edit` — outbound text messages only. Patches the cached row
 * in place (`text_content` + `is_edited: true`) rather than invalidating. */
export function useTelegramEditMutation(chatId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { messageId: string; text: string }) => telegramMessagesApi.edit(params.messageId, params.text),
    onSuccess: (_updated, params) => {
      if (!chatId) return;
      queryClient.setQueryData<TelegramMessage[]>(MESSAGES_KEY(chatId), (prev) =>
        prev?.map((m) => (m.id === params.messageId ? { ...m, text_content: params.text, is_edited: true } : m)),
      );
    },
  });
}

/** `POST :id/telegram-delete` — removes the row from the open thread's
 * cache on success (the message is gone on Telegram too, not just hidden). */
export function useTelegramDeleteMutation(chatId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { messageId: string; revoke?: boolean }) =>
      telegramMessagesApi.remove(params.messageId, { revoke: params.revoke }),
    onSuccess: (_void, params) => {
      if (!chatId) return;
      queryClient.setQueryData<TelegramMessage[]>(MESSAGES_KEY(chatId), (prev) =>
        prev?.filter((m) => m.id !== params.messageId),
      );
    },
  });
}

/** `POST /telegram-meassages/forward` — forwards into another chat. Doesn't
 * touch the source thread's cache; invalidates the target chat's messages
 * (in case it's also open in another tab/pane) and debounced chat-list
 * previews, same as a normal send. */
export function useTelegramForwardMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sourceChatId: string; targetChatId: string; messageIds: string[]; senderId?: string }) =>
      telegramMessagesApi.forward(params),
    onSuccess: (_result, params) => {
      void queryClient.invalidateQueries({ queryKey: MESSAGES_KEY(params.targetChatId) });
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: ["telegram-chats", workspaceId] });
    },
  });
}

export function useTelegramMarkReadMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => telegramChatsApi.markRead(chatId, workspaceId as string),
    onSuccess: () => {
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: ["telegram-chats", workspaceId] });
    },
  });
}

export function useTelegramLinkLeadMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { chatId: string; leadId: string | null }) =>
      telegramChatsApi.linkLead(params.chatId, workspaceId as string, params.leadId),
    onSuccess: () => {
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: ["telegram-chats", workspaceId] });
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
