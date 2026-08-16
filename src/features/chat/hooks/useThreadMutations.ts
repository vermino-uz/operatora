"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatThreadsApi } from "@/services/api/chat";
import { chatThreadsQueryKey } from "@/features/chat/hooks/useThreadsQuery";
import { toChatThread, type ChatThread, type ThreadMessagePayload } from "@/features/chat/types";

/**
 * Thread CRUD mutations. Every one invalidates the shared threads-list
 * query on success rather than hand-patching the cache for title/rename/
 * delete flows (small list, cheap refetch, and it keeps `updated_at`
 * ordering authoritative). Appending a single message during an active
 * send is the one exception — see `useChatController`, which patches the
 * cache optimistically for that hot path instead of waiting on a refetch.
 */
export function useThreadMutations(workspaceId: string | null) {
  const queryClient = useQueryClient();
  const key = chatThreadsQueryKey(workspaceId);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const createThread = useMutation({
    mutationKey: ["chat", "threads", "create"],
    mutationFn: async (body: { title?: string; messages?: ThreadMessagePayload[] }): Promise<ChatThread> => {
      if (!workspaceId) throw new Error("No active workspace.");
      const row = await chatThreadsApi.create(workspaceId, body);
      return toChatThread(row);
    },
    retry: false,
    onSuccess: invalidate,
  });

  const renameThread = useMutation({
    mutationKey: ["chat", "threads", "rename"],
    mutationFn: async (params: { threadId: string; title: string }): Promise<ChatThread> => {
      if (!workspaceId) throw new Error("No active workspace.");
      const row = await chatThreadsApi.update(workspaceId, params.threadId, { title: params.title });
      return toChatThread(row);
    },
    retry: false,
    onSuccess: invalidate,
  });

  const deleteThread = useMutation({
    mutationKey: ["chat", "threads", "delete"],
    mutationFn: async (threadId: string) => {
      if (!workspaceId) throw new Error("No active workspace.");
      return chatThreadsApi.remove(workspaceId, threadId);
    },
    retry: false,
    onSuccess: invalidate,
  });

  return { createThread, renameThread, deleteThread };
}
