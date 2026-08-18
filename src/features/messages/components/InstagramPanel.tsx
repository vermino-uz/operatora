"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@heroui/react";
import { Magnifier as Search } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDebounce } from "@/hooks/useDebounce";
import { ConversationListItem } from "@/features/messages/components/ConversationListItem";
import { MessageBubbleRow } from "@/features/messages/components/MessageBubbleRow";
import { TextComposer } from "@/features/messages/components/TextComposer";
import { LinkedLeadChip } from "@/features/messages/components/LinkedLeadChip";
import { LinkLeadDialog } from "@/features/messages/components/LinkLeadDialog";
import { instagramChatName } from "@/features/messages/types";
import {
  useInstagramChatsQuery,
  useInstagramLinkLeadMutation,
  useInstagramMessagesQuery,
  useInstagramRealtime,
  useInstagramSendMutation,
} from "@/features/messages/hooks/useInstagramInbox";

/**
 * Instagram customer-inbox channel. Real contract traced directly against
 * `instagram.controller.ts` (`/instagram/conversations*`,
 * `/instagram/send-message`) — see `services/api/instagramMessages.ts`.
 * No `mark as read` endpoint exists on this controller (confirmed by
 * reading it fully — unlike Telegram's `PATCH :id/read`), so unread counts
 * here are display-only, matching the real backend surface rather than a
 * fabricated read receipt.
 */
export function InstagramPanel({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const chatsQuery = useInstagramChatsQuery();
  const allChats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);
  const chats = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return allChats;
    return allChats.filter((c) => instagramChatName(c).toLowerCase().includes(q));
  }, [allChats, debouncedSearch]);
  const selectedChat = allChats.find((c) => c.id === selectedChatId) ?? null;

  const messagesQuery = useInstagramMessagesQuery(selectedChatId);
  const sendMutation = useInstagramSendMutation(selectedChatId);
  const linkLeadMutation = useInstagramLinkLeadMutation();

  useInstagramRealtime(true, selectedChatId);

  useEffect(() => {
    const total = allChats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
    onUnreadChange?.(total);
  }, [allChats, onUnreadChange]);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-80 shrink-0 flex-col border-r border-black/[0.06] dark:border-white/10">
        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
            <Input aria-label="Search Instagram chats" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats…" className="pl-8" fullWidth />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {chatsQuery.isLoading ? (
            <LoadingState label="Loading chats…" />
          ) : chatsQuery.isError ? (
            <ErrorState error={chatsQuery.error} onRetry={() => chatsQuery.refetch()} />
          ) : chats.length === 0 ? (
            <EmptyState
              title={allChats.length === 0 ? "No Instagram conversations yet" : "No matches"}
              description={allChats.length === 0 ? "Conversations will appear here once customers DM your connected account." : "Try a different search term."}
            />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {chats.map((chat) => (
                <ConversationListItem
                  key={chat.id}
                  id={chat.id}
                  name={instagramChatName(chat)}
                  preview={chat.last_message_preview}
                  timestamp={chat.last_message_at}
                  unreadCount={chat.unread_count}
                  avatarUrl={chat.profile_pic}
                  active={chat.id === selectedChatId}
                  onSelect={setSelectedChatId}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!selectedChat ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="Select a conversation" description="Choose an Instagram chat from the list to view messages." />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
              <p className="truncate text-sm font-semibold text-foreground">{instagramChatName(selectedChat)}</p>
              <LinkedLeadChip linkedLeadId={selectedChat.linked_lead_id ?? null} onOpenDialog={() => setLinkDialogOpen(true)} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {messagesQuery.isLoading ? (
                <LoadingState label="Loading messages…" />
              ) : messagesQuery.isError ? (
                <ErrorState error={messagesQuery.error} onRetry={() => messagesQuery.refetch()} />
              ) : (messagesQuery.data ?? []).length === 0 ? (
                <EmptyState title="No messages yet" description="Send the first message below." />
              ) : (
                (messagesQuery.data ?? []).map((message) => (
                  <MessageBubbleRow
                    key={message.id}
                    content={message.text_content || "(non-text message — not shown, see Messages scope notes)"}
                    direction={message.direction}
                    timestamp={message.created_at}
                    status={message.status}
                  />
                ))
              )}
            </div>
            <TextComposer
              onSend={(text) => sendMutation.mutate(text)}
              isSending={sendMutation.isPending}
              disabled={Boolean(selectedChat.conversation_closed_at)}
              disabledReason={selectedChat.conversation_closed_at ? "This conversation is marked closed." : undefined}
            />
            {sendMutation.isError ? (
              <p role="alert" className="px-4 pb-2 text-xs text-danger">
                Failed to send. Try again.
              </p>
            ) : null}
          </>
        )}
      </div>

      {linkDialogOpen && selectedChat ? (
        <LinkLeadDialog
          currentLeadId={selectedChat.linked_lead_id ?? null}
          isLinking={linkLeadMutation.isPending}
          isUnlinking={linkLeadMutation.isPending}
          onLink={(leadId) => linkLeadMutation.mutateAsync({ chatId: selectedChat.id, leadId })}
          onUnlink={() => linkLeadMutation.mutateAsync({ chatId: selectedChat.id, leadId: null })}
          onClose={() => setLinkDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
