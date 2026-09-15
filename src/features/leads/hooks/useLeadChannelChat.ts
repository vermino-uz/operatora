"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { telegramChatsApi, telegramMessagesApi } from "@/services/api/telegramMessages";
import { instagramConversationsApi } from "@/services/api/instagramMessages";
import type { InstagramMessage, TelegramMessage } from "@/features/messages/types";

export type LeadChatChannel = "telegram" | "instagram";

/** One normalized shape both channels render into for the Leads
 * channel-chat popup — `LeadChannelChatDialog` doesn't need to know which
 * channel it's showing beyond picking the right hooks below. */
export interface LeadChatMessage {
  id: string;
  text: string;
  direction: "inbound" | "outbound";
  status: string;
  createdAt: string;
}

function fromTelegram(m: TelegramMessage): LeadChatMessage {
  return { id: m.id, text: m.text_content ?? "", direction: m.direction, status: m.status, createdAt: m.created_at };
}

function fromInstagram(m: InstagramMessage): LeadChatMessage {
  return { id: m.id, text: m.text_content ?? "", direction: m.direction, status: m.status, createdAt: m.created_at };
}

/** Resolves the lead's chat id for one channel — `null` while loading and
 * `undefined` once resolved with no chat found (this lead has never
 * messaged in on this channel). See `telegramChatsApi.getChatForLead` /
 * `instagramConversationsApi.getChatForLead` for the actual match logic. */
export function useLeadChannelChatId(
  channel: LeadChatChannel,
  leadId: string,
  workspaceId: string | null,
  phone: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["lead-channel-chat", channel, leadId],
    queryFn: () =>
      channel === "telegram"
        ? telegramChatsApi.getChatForLead(leadId, workspaceId as string, phone)
        : instagramConversationsApi.getChatForLead(leadId),
    enabled: enabled && Boolean(leadId) && (channel === "instagram" || Boolean(workspaceId)),
  });
}

export function useLeadChannelMessagesQuery(channel: LeadChatChannel, chatId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-channel-chat-messages", channel, chatId],
    queryFn: async (): Promise<LeadChatMessage[]> => {
      if (!chatId) return [];
      if (channel === "telegram") return (await telegramMessagesApi.list(chatId)).map(fromTelegram);
      return (await instagramConversationsApi.listMessages(chatId)).map(fromInstagram);
    },
    enabled: enabled && Boolean(chatId),
  });
}

export function useLeadChannelSendMutation(channel: LeadChatChannel, chatId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => {
      if (!chatId) return Promise.reject(new Error("No conversation to send to yet"));
      return channel === "telegram"
        ? telegramMessagesApi.send({ chatId, text })
        : instagramConversationsApi.send({ conversationId: chatId, text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-channel-chat-messages", channel, chatId] });
    },
  });
}
