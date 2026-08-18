"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { eskizSmsApi } from "@/services/api/eskizSms";
import { subscribeToEskizEvents } from "@/services/realtime/subscriptions";
import type { EskizMessage } from "@/features/leads/types";

const CHATS_KEY = ["eskiz-chats"] as const;
const MESSAGES_KEY = (chatId: string) => ["eskiz-messages", chatId] as const;
const INVALIDATE_DEBOUNCE_MS = 800;

/** Reuses the already-built `eskizSmsApi` (Phase 2c-8's Leads SMS slice) —
 * same account/templates/send/chats contract, now exposed as an inbox
 * channel instead of a lead-scoped compose dialog. See PROGRESS.md's
 * "Leads — SMS templates + compose" entry for the full pipeline trace
 * (real Eskiz gateway, not the dead `lead_sms_*` tables). */
export function useEskizAccountQuery() {
  return useQuery({ queryKey: ["eskiz-account"], queryFn: () => eskizSmsApi.getAccount(), staleTime: 60_000 });
}

export function useEskizTemplatesQuery(enabled: boolean) {
  return useQuery({ queryKey: ["eskiz-templates"], queryFn: () => eskizSmsApi.listTemplates(), enabled, staleTime: 30_000 });
}

export function useEskizChatsQuery(enabled: boolean) {
  return useQuery({ queryKey: CHATS_KEY, queryFn: () => eskizSmsApi.listChats(), enabled, staleTime: 15_000 });
}

export function useEskizMessagesQuery(chatId: string | null) {
  return useQuery({
    queryKey: chatId ? MESSAGES_KEY(chatId) : ["eskiz-messages-disabled"],
    queryFn: () => eskizSmsApi.listChatMessages(chatId as string),
    enabled: Boolean(chatId),
    staleTime: 5_000,
  });
}

/** Optimistic send — see `useTelegramSendMutation`'s doc comment for why
 * (the send response body can be empty, so the composer had nothing to
 * append without this and the operator's own message never appeared).
 * Only optimistic for an existing chat (`chatId` known) — a brand-new
 * chat's id isn't known client-side until the server assigns one, so that
 * case still relies on the invalidate-and-refetch fallback below. */
export function useEskizSendMutation(chatId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { phone: string; templateId: string; text?: string }) =>
      eskizSmsApi.send({ phone: payload.phone, template_id: payload.templateId, text: payload.text }),
    onMutate: (payload) => {
      if (!chatId) return {};
      const tempId = `optimistic-${crypto.randomUUID()}`;
      const optimistic: EskizMessage = {
        id: tempId,
        workspace_id: "",
        chat_id: chatId,
        template_id: payload.templateId || null,
        text: payload.text ?? "",
        status: "pending",
        eskiz_message_id: null,
        error_message: null,
        status_updated_at: null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<EskizMessage[]>(MESSAGES_KEY(chatId), (prev) => (prev ? [...prev, optimistic] : [optimistic]));
      return { tempId };
    },
    onError: (_err, _payload, context) => {
      if (!chatId || !context?.tempId) return;
      const tempId = context.tempId;
      queryClient.setQueryData<EskizMessage[]>(MESSAGES_KEY(chatId), (prev) =>
        prev?.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
      );
    },
    onSuccess: (message, _payload, context) => {
      const tempId = context?.tempId;
      // A 204/empty-body response resolves `message` as `undefined` (see
      // `apiFetch`) — don't push that into the cache or read its fields,
      // just mark the optimistic bubble sent. Deliberately no
      // `MESSAGES_KEY` invalidate here: an immediate refetch can race the
      // backend's own write and wholesale-replace the cache, wiping the
      // bubble we just showed. Reconciled via `useEskizRealtime` instead.
      if (!message) {
        if (chatId && tempId) {
          queryClient.setQueryData<EskizMessage[]>(MESSAGES_KEY(chatId), (prev) =>
            prev?.map((m) => (m.id === tempId ? { ...m, status: "sent" } : m)),
          );
        }
        void queryClient.invalidateQueries({ queryKey: CHATS_KEY });
        return;
      }
      if (chatId && message.chat_id === chatId) {
        queryClient.setQueryData<EskizMessage[]>(MESSAGES_KEY(chatId), (prev) => {
          if (!prev) return [message];
          const hadTemp = tempId && prev.some((m) => m.id === tempId);
          return hadTemp ? prev.map((m) => (m.id === tempId ? message : m)) : [...prev, message];
        });
      }
      void queryClient.invalidateQueries({ queryKey: CHATS_KEY });
      // A brand-new chat (first message to this phone) has no cached
      // message list yet under its own id — invalidate broadly so the
      // conversation appears once the chat list refetches. Skipped when
      // it's the chat we just optimistically updated above — invalidating
      // that one too would race the backend's own write and risk
      // wholesale-replacing (and dropping) the message we just merged in.
      if (message.chat_id && message.chat_id !== chatId) void queryClient.invalidateQueries({ queryKey: MESSAGES_KEY(message.chat_id) });
    },
  });
}

export function useEskizLinkLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { chatId: string; leadId: string | null }) =>
      eskizSmsApi.linkChatToLead(params.chatId, params.leadId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CHATS_KEY }),
  });
}

export function useEskizRealtime(enabled: boolean, selectedChatId: string | null) {
  const queryClient = useQueryClient();
  const selectedChatIdRef = useRef(selectedChatId);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

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

    const unsubscribe = subscribeToEskizEvents({
      onNewMessage: (row) => {
        const chatId = typeof row.chat_id === "string" ? row.chat_id : undefined;
        if (chatId && chatId === selectedChatIdRef.current) {
          queryClient.setQueryData<EskizMessage[]>(MESSAGES_KEY(chatId), (prev) => {
            const message = row as unknown as EskizMessage;
            if (!prev) return [message];
            if (prev.some((m) => m.id === message.id)) return prev;
            const tempIndex = prev.findIndex((m) => m.id.startsWith("optimistic-") && m.text === message.text);
            if (tempIndex !== -1) {
              const next = [...prev];
              next[tempIndex] = message;
              return next;
            }
            return [...prev, message];
          });
        }
        scheduleListInvalidate();
      },
      onStatusUpdated: (row) => {
        const chatId = typeof row.chat_id === "string" ? row.chat_id : undefined;
        const id = typeof row.id === "string" ? row.id : undefined;
        if (chatId && id) {
          queryClient.setQueryData<EskizMessage[]>(MESSAGES_KEY(chatId), (prev) =>
            prev?.map((m) => (m.id === id ? { ...m, ...(row as unknown as EskizMessage) } : m)),
          );
        }
      },
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [enabled, queryClient]);
}
