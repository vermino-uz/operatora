"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { teamChatApi } from "@/services/api/teamChat";
import { subscribeToTeamChatMessages } from "@/services/realtime/subscriptions";

const CHANNELS_KEY = (workspaceId: string) => ["team-chat-channels", workspaceId] as const;
const FEED_KEY = (workspaceId: string, channelId?: string) => ["team-chat-feed", workspaceId, channelId ?? "general"] as const;

export function useTeamChatChannelsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceId ? CHANNELS_KEY(workspaceId) : ["team-chat-channels-disabled"],
    queryFn: () => teamChatApi.listChannels(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}

export function useTeamChatFeedQuery(workspaceId: string | null, channelId?: string) {
  return useQuery({
    queryKey: workspaceId ? FEED_KEY(workspaceId, channelId) : ["team-chat-feed-disabled"],
    queryFn: () => teamChatApi.listMessages(workspaceId as string, channelId),
    enabled: Boolean(workspaceId),
    staleTime: 5_000,
  });
}

export function useTeamChatSendMutation(workspaceId: string | null, channelId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => teamChatApi.send({ workspaceId: workspaceId as string, channelId, content }),
    onSuccess: () => {
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: FEED_KEY(workspaceId, channelId) });
    },
  });
}

/** Team Chat's messages arrive over the generic `messages:{workspaceId}`
 * realtime topic (see `subscriptions.ts`) — a "something changed" signal,
 * not the full row, so this just debounce-invalidates the active feed
 * query rather than patching the cache directly. */
export function useTeamChatRealtime(workspaceId: string | null, channelId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const unsubscribe = subscribeToTeamChatMessages(workspaceId, () => {
      void queryClient.invalidateQueries({ queryKey: FEED_KEY(workspaceId, channelId) });
    });
    return unsubscribe;
  }, [workspaceId, channelId, queryClient]);
}
