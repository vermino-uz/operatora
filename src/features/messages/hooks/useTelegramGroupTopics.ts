"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { telegramAccountApi } from "@/services/api/telegramAccount";
import type { TelegramForumTopic } from "@/features/messages/types";

export function telegramGroupTopicsQueryKey(chatId: string | null) {
  return ["telegram-group-topics", chatId] as const;
}

/** Forum topics for a supergroup — TDLib linked account only. Returns
 * `null` when the chat is not a forum (API 400 / Pyrogram). */
export function useTelegramGroupTopicsQuery(chatId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: telegramGroupTopicsQueryKey(chatId),
    queryFn: async (): Promise<TelegramForumTopic[] | null> => {
      try {
        const data = await telegramAccountApi.listGroupTopics(chatId as string);
        return Array.isArray(data?.topics) ? data.topics : [];
      } catch {
        return null;
      }
    },
    enabled: Boolean(chatId) && enabled,
    staleTime: 60_000,
  });
}

export function useTelegramGroupTopicMutations(chatId: string | null) {
  const queryClient = useQueryClient();

  function invalidate() {
    if (chatId) void queryClient.invalidateQueries({ queryKey: telegramGroupTopicsQueryKey(chatId) });
  }

  const create = useMutation({
    mutationFn: (name: string) => telegramAccountApi.createGroupTopic(chatId as string, name),
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: ({ topicId, name }: { topicId: number; name: string }) =>
      telegramAccountApi.renameGroupTopic(chatId as string, topicId, name),
    onSuccess: invalidate,
  });

  const setClosed = useMutation({
    mutationFn: ({ topicId, isClosed }: { topicId: number; isClosed: boolean }) =>
      telegramAccountApi.setGroupTopicClosed(chatId as string, topicId, isClosed),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (topicId: number) => telegramAccountApi.deleteGroupTopic(chatId as string, topicId),
    onSuccess: invalidate,
  });

  return { create, rename, setClosed, remove };
}
