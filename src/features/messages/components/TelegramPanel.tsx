"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@heroui/react";
import { Magnifier as Search } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDebounce } from "@/hooks/useDebounce";
import { useSessionStore } from "@/state/session-store";
import { ConversationListItem } from "@/features/messages/components/ConversationListItem";
import { MessageBubbleRow } from "@/features/messages/components/MessageBubbleRow";
import { TextComposer } from "@/features/messages/components/TextComposer";
import { LinkedLeadChip } from "@/features/messages/components/LinkedLeadChip";
import { LinkLeadDialog } from "@/features/messages/components/LinkLeadDialog";
import { telegramChatName } from "@/features/messages/types";
import {
  useTelegramChatsQuery,
  useTelegramLinkLeadMutation,
  useTelegramMarkReadMutation,
  useTelegramMessagesQuery,
  useTelegramRealtime,
  useTelegramSendMutation,
} from "@/features/messages/hooks/useTelegramInbox";

/**
 * Telegram customer-inbox channel. Real contract traced directly against
 * `telegram-chats.controller.ts`/`telegram-meassages.controller.ts` (see
 * `services/api/telegramMessages.ts`). Scoped to the bot/business inbox +
 * text send/receive — see `features/messages/types.ts` header comment for
 * what's deliberately not built here (userbot mode, media, reactions,
 * edit/delete/forward, the agentic AI subsystem).
 */
export function TelegramPanel({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const chatsQuery = useTelegramChatsQuery(workspaceId, debouncedSearch);
  const chats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);
  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;

  const messagesQuery = useTelegramMessagesQuery(selectedChatId);
  const sendMutation = useTelegramSendMutation(selectedChatId);
  const markReadMutation = useTelegramMarkReadMutation(workspaceId);
  const linkLeadMutation = useTelegramLinkLeadMutation(workspaceId);

  useTelegramRealtime(workspaceId, selectedChatId);

  useEffect(() => {
    const total = chats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
    onUnreadChange?.(total);
  }, [chats, onUnreadChange]);

  useEffect(() => {
    if (selectedChatId && (selectedChat?.unread_count ?? 0) > 0 && !markReadMutation.isPending) {
      markReadMutation.mutate(selectedChatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId]);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-80 shrink-0 flex-col border-r border-black/[0.06] dark:border-white/10">
        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
            <Input aria-label="Search Telegram chats" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats…" className="pl-8" fullWidth />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {chatsQuery.isLoading ? (
            <LoadingState label="Loading chats…" />
          ) : chatsQuery.isError ? (
            <ErrorState error={chatsQuery.error} onRetry={() => chatsQuery.refetch()} />
          ) : chats.length === 0 ? (
            <EmptyState title="No Telegram chats yet" description="Conversations will appear here once customers message your bot." />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {chats.map((chat) => (
                <ConversationListItem
                  key={chat.id}
                  id={chat.id}
                  name={telegramChatName(chat)}
                  preview={chat.last_message_preview}
                  timestamp={chat.last_message_at}
                  unreadCount={chat.unread_count}
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
            <EmptyState title="Select a conversation" description="Choose a Telegram chat from the list to view messages." />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
              <p className="truncate text-sm font-semibold text-foreground">{telegramChatName(selectedChat)}</p>
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
