"use client";

import { useState } from "react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSessionStore } from "@/state/session-store";
import { MessageBubbleRow } from "@/features/messages/components/MessageBubbleRow";
import { TextComposer } from "@/features/messages/components/TextComposer";
import { profileName } from "@/features/messages/types";
import {
  useTeamChatChannelsQuery,
  useTeamChatFeedQuery,
  useTeamChatRealtime,
  useTeamChatSendMutation,
} from "@/features/messages/hooks/useTeamChat";

/**
 * Internal Team Chat — real backend (`messages-page/group-chat.controller
 * .ts`), scoped to channel list + message feed + plain-text send. Not
 * built here (real, traced, out of scope for this pass — see
 * `services/api/teamChat.ts`'s doc comment): channel create/update
 * (pin/archive/rename/write_roles admin management), attachment upload,
 * message edit/delete, @mention notifications.
 */
export function TeamChatPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const [channelId, setChannelId] = useState<string | undefined>(undefined);

  const channelsQuery = useTeamChatChannelsQuery(workspaceId);
  const channels = channelsQuery.data ?? [];
  const activeChannelId = channelId ?? channels.find((c) => c.name === "general")?.id ?? channels[0]?.id;

  const feedQuery = useTeamChatFeedQuery(workspaceId, activeChannelId);
  const sendMutation = useTeamChatSendMutation(workspaceId, activeChannelId);
  useTeamChatRealtime(workspaceId, activeChannelId);

  const profileById = new Map((feedQuery.data?.profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-64 shrink-0 flex-col border-r border-black/[0.06] dark:border-white/10">
        <p className="px-4 pt-4 pb-2 text-xs font-medium uppercase tracking-wide text-foreground/40">Channels</p>
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          {channelsQuery.isLoading ? (
            <LoadingState label="Loading channels…" />
          ) : channelsQuery.isError ? (
            <ErrorState error={channelsQuery.error} onRetry={() => channelsQuery.refetch()} />
          ) : channels.length === 0 ? (
            <EmptyState title="No channels" />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {channels.map((channel) => (
                <li key={channel.id}>
                  <button
                    type="button"
                    onClick={() => setChannelId(channel.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      channel.id === activeChannelId ? "bg-[var(--default)] font-medium text-foreground" : "text-foreground/70 hover:bg-[var(--default)]/60"
                    }`}
                  >
                    # {channel.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!activeChannelId ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="No channel selected" />
          </div>
        ) : (
          <>
            <div className="border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
              <p className="text-sm font-semibold text-foreground">
                # {channels.find((c) => c.id === activeChannelId)?.name ?? "general"}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {feedQuery.isLoading ? (
                <LoadingState label="Loading messages…" />
              ) : feedQuery.isError ? (
                <ErrorState error={feedQuery.error} onRetry={() => feedQuery.refetch()} />
              ) : (feedQuery.data?.messages ?? []).length === 0 ? (
                <EmptyState title="No messages yet" description="Say hello to your team." />
              ) : (
                (feedQuery.data?.messages ?? []).map((message) => (
                  <div key={message.id} className={`px-4 py-1 ${message.sender_id === userId ? "" : ""}`}>
                    <p className="mb-0.5 px-0 text-[11px] font-medium text-foreground/50">
                      {profileName(profileById.get(message.sender_id), message.sender_id)}
                    </p>
                    <MessageBubbleRow
                      content={message.content || "(attachment)"}
                      direction={message.sender_id === userId ? "outbound" : "inbound"}
                      timestamp={message.created_at}
                    />
                  </div>
                ))
              )}
            </div>
            <TextComposer onSend={(text) => sendMutation.mutate(text)} isSending={sendMutation.isPending} placeholder="Message the team…" />
            {sendMutation.isError ? (
              <p role="alert" className="px-4 pb-2 text-xs text-danger">
                Failed to send. Try again.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
