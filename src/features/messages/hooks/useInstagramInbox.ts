"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { instagramConversationsApi } from "@/services/api/instagramMessages";
import { applyInstagramConversationUpdated } from "@/features/messages/lib/instagramChatRealtime";
import {
  invalidateAgenticDrafts,
  setAgenticSettingsCache,
} from "@/features/messages/hooks/useAgentic";
import type { AgenticSettings } from "@/services/api/agentic";
import { subscribeToInstagramEvents } from "@/services/realtime/subscriptions";
import type { InstagramMessage } from "@/features/messages/types";

const CHATS_KEY = ["instagram-chats"] as const;
const MESSAGES_KEY = (chatId: string) => ["instagram-messages", chatId] as const;
const INVALIDATE_DEBOUNCE_MS = 800;

export function useInstagramChatsQuery() {
  return useQuery({
    queryKey: CHATS_KEY,
    queryFn: () => instagramConversationsApi.list(),
    staleTime: 15_000,
  });
}

export function useInstagramMessagesQuery(chatId: string | null) {
  return useQuery({
    queryKey: chatId ? MESSAGES_KEY(chatId) : ["instagram-messages-disabled"],
    queryFn: () => instagramConversationsApi.listMessages(chatId as string),
    enabled: Boolean(chatId),
    staleTime: 5_000,
  });
}

/** Optimistic send — see `useTelegramSendMutation`'s doc comment for why
 * (the send response body is empty, so the composer had nothing to
 * append without this and the operator's own message never appeared). */
export function useInstagramSendMutation(chatId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => instagramConversationsApi.send({ conversationId: chatId as string, text }),
    onMutate: (text) => {
      if (!chatId) return {};
      const tempId = `optimistic-${crypto.randomUUID()}`;
      const optimistic: InstagramMessage = {
        id: tempId,
        chat_id: chatId,
        direction: "outbound",
        text_content: text,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<InstagramMessage[]>(MESSAGES_KEY(chatId), (prev) => (prev ? [...prev, optimistic] : [optimistic]));
      return { tempId };
    },
    onSuccess: (message, _text, context) => {
      if (!chatId) return;
      const tempId = context?.tempId;
      queryClient.setQueryData<InstagramMessage[]>(MESSAGES_KEY(chatId), (prev) =>
        prev?.map((m) => (m.id === tempId ? (message ?? { ...m, status: "sent" }) : m)),
      );
      // Deliberately no invalidate/refetch here — see
      // `useTelegramSendMutation`'s doc comment for why (a refetch can
      // race the backend's own write and wipe the bubble). Reconciled via
      // `useInstagramRealtime`'s `onNewMessage` instead.
    },
    onError: (_err, _text, context) => {
      if (!chatId || !context?.tempId) return;
      const tempId = context.tempId;
      queryClient.setQueryData<InstagramMessage[]>(MESSAGES_KEY(chatId), (prev) =>
        prev?.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
      );
    },
  });
}

export function useInstagramLinkLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { chatId: string; leadId: string | null }) =>
      instagramConversationsApi.linkLead(params.chatId, params.leadId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CHATS_KEY }),
  });
}

export function useInstagramRealtime(
  enabled: boolean,
  selectedChatId: string | null,
  opts?: { onChatDeleted?: (chatId: string) => void },
) {
  const queryClient = useQueryClient();
  const selectedChatIdRef = useRef(selectedChatId);
  const optsRef = useRef(opts);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  useEffect(() => {
    if (!enabled) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleListInvalidate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void queryClient.invalidateQueries({ queryKey: CHATS_KEY });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeToInstagramEvents({
      onNewMessage: (row) => {
        const chatId = typeof row.chat_id === "string" ? row.chat_id : undefined;
        if (chatId && chatId === selectedChatIdRef.current) {
          queryClient.setQueryData<InstagramMessage[]>(MESSAGES_KEY(chatId), (prev) => {
            const message = row as unknown as InstagramMessage;
            if (!prev) return [message];
            if (prev.some((m) => m.id === message.id)) return prev;
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
      onConversationUpdated: (row) => {
        applyInstagramConversationUpdated(queryClient, row, {
          onDeleted: (chatId) => optsRef.current?.onChatDeleted?.(chatId),
          onMissingChat: scheduleListInvalidate,
        });
      },
      onAgenticDraft: () => invalidateAgenticDrafts(queryClient, "instagram"),
      onAgenticSettings: (row) => setAgenticSettingsCache(queryClient, row as unknown as AgenticSettings, "instagram"),
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [enabled, queryClient]);
}
