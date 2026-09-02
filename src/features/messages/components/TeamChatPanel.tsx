"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSessionStore } from "@/state/session-store";
import { TeamChatMessageRow, isTeamChatContinuation } from "@/features/messages/components/TeamChatMessageRow";
import { TextComposer } from "@/features/messages/components/TextComposer";
import { DaySeparator, groupMessagesByDay } from "@/features/messages/lib/messageDayGroups";
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
export function TeamChatPanel({ onChatOpenChange }: { onChatOpenChange?: (open: boolean) => void }) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const [channelId, setChannelId] = useState<string | undefined>(undefined);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const channelsQuery = useTeamChatChannelsQuery(workspaceId);
  const channels = channelsQuery.data ?? [];
  const activeChannelId = channelId ?? channels.find((c) => c.name === "general")?.id ?? channels[0]?.id;
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const feedQuery = useTeamChatFeedQuery(workspaceId, activeChannelId);
  const sendMutation = useTeamChatSendMutation(workspaceId, activeChannelId);
  useTeamChatRealtime(workspaceId, activeChannelId);

  const profileById = new Map((feedQuery.data?.profiles ?? []).map((p) => [p.id, p]));
  const messages = feedQuery.data?.messages ?? [];
  const messageDayGroups = groupMessagesByDay(messages, (m) => m.created_at);

  useEffect(() => {
    onChatOpenChange?.(mobileThreadOpen);
  }, [mobileThreadOpen, onChatOpenChange]);

  function selectChannel(id: string) {
    setChannelId(id);
    setMobileThreadOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className={`${mobileThreadOpen ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-black/[0.06] md:w-64 dark:border-white/10`}>
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
                    onClick={() => selectChannel(channel.id)}
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

      <div className={`${!mobileThreadOpen ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-1 flex-col`}>
        {!activeChannelId ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="No channel selected" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
              <button
                type="button"
                aria-label="Back to channels"
                onClick={() => setMobileThreadOpen(false)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-foreground/60 hover:bg-[var(--default)] hover:text-foreground md:hidden"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <p className="truncate text-sm font-semibold text-foreground"># {activeChannel?.name ?? "general"}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {feedQuery.isLoading ? (
                <LoadingState label="Loading messages…" />
              ) : feedQuery.isError ? (
                <ErrorState error={feedQuery.error} onRetry={() => feedQuery.refetch()} />
              ) : messages.length === 0 ? (
                <EmptyState title="No messages yet" description="Say hello to your team." />
              ) : (
                messageDayGroups.map((group) => (
                  <div key={group.label}>
                    <DaySeparator label={group.label} />
                    {group.items.map((message, idx) => {
                      const prev = idx > 0 ? group.items[idx - 1] : null;
                      return (
                        <div key={message.id} className="px-4">
                          <TeamChatMessageRow
                            message={message}
                            profile={profileById.get(message.sender_id)}
                            isOwn={message.sender_id === userId}
                            isContinuation={isTeamChatContinuation(prev, message)}
                          />
                        </div>
                      );
                    })}
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
