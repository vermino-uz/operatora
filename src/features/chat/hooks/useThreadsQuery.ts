"use client";

import { useQuery } from "@tanstack/react-query";
import { chatThreadsApi } from "@/services/api/chat";
import { toChatThread, type ChatThread } from "@/features/chat/types";

export function chatThreadsQueryKey(workspaceId: string | null) {
  return ["chat", "threads", workspaceId] as const;
}

/**
 * Server state for the thread list (and, since the backend returns full rows
 * including `messages`, the source of truth for each thread's message
 * history too — there is no separate single-thread GET endpoint). Never
 * fires while `workspaceId` is null (per the feature brief: no thread/chat
 * request should go out without a workspace).
 */
export function useThreadsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: chatThreadsQueryKey(workspaceId),
    queryFn: async (): Promise<ChatThread[]> => {
      const rows = await chatThreadsApi.list(workspaceId as string);
      return rows.map(toChatThread);
    },
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}
