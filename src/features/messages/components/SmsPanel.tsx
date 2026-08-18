"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConversationListItem } from "@/features/messages/components/ConversationListItem";
import { MessageBubbleRow } from "@/features/messages/components/MessageBubbleRow";
import { SmsComposer, NewSmsPhoneField } from "@/features/messages/components/SmsComposer";
import { LinkedLeadChip } from "@/features/messages/components/LinkedLeadChip";
import { LinkLeadDialog } from "@/features/messages/components/LinkLeadDialog";
import {
  useEskizAccountQuery,
  useEskizChatsQuery,
  useEskizLinkLeadMutation,
  useEskizMessagesQuery,
  useEskizRealtime,
  useEskizSendMutation,
  useEskizTemplatesQuery,
} from "@/features/messages/hooks/useSmsInbox";

/**
 * SMS customer-inbox channel — built entirely on the already-real
 * `eskizSmsApi` (Phase 2c-8's Leads SMS slice), now exposed as an inbox
 * instead of a lead-scoped compose dialog. Requires the workspace to have
 * connected an Eskiz account first (Settings → Eskiz); this panel handles
 * "not connected" with an explicit empty state pointing there, same
 * precedent `eskizSms.ts`'s own doc comment already established.
 */
export function SmsPanel() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const accountQuery = useEskizAccountQuery();
  const connected = accountQuery.data?.connection_status === "connected";

  const chatsQuery = useEskizChatsQuery(connected);
  const chats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);
  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;

  const templatesQuery = useEskizTemplatesQuery(connected);
  const messagesQuery = useEskizMessagesQuery(selectedChatId);
  const sendMutation = useEskizSendMutation(selectedChatId);
  const linkLeadMutation = useEskizLinkLeadMutation();

  useEskizRealtime(connected, selectedChatId);

  if (accountQuery.isLoading) return <LoadingState label="Loading SMS…" className="flex-1" />;
  if (accountQuery.isError) return <ErrorState error={accountQuery.error} onRetry={() => accountQuery.refetch()} className="flex-1" />;
  if (!connected) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          title="SMS not connected"
          description="Connect an Eskiz account in Settings to send and receive SMS."
          action={
            <Link href="/settings?section=eskiz">
              <Button size="sm">Open Settings</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const activePhone = selectedChat?.phone_number ?? pendingPhone ?? null;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-80 shrink-0 flex-col border-r border-black/[0.06] dark:border-white/10">
        <NewSmsPhoneField
          onStart={(phone) => {
            setPendingPhone(phone);
            setSelectedChatId(null);
          }}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {chatsQuery.isLoading ? (
            <LoadingState label="Loading chats…" />
          ) : chatsQuery.isError ? (
            <ErrorState error={chatsQuery.error} onRetry={() => chatsQuery.refetch()} />
          ) : chats.length === 0 ? (
            <EmptyState title="No SMS conversations yet" description="Start a new one using the phone field above." />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {chats.map((chat) => (
                <ConversationListItem
                  key={chat.id}
                  id={chat.id}
                  name={chat.phone_number}
                  active={chat.id === selectedChatId}
                  onSelect={(id) => {
                    setSelectedChatId(id);
                    setPendingPhone(null);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!activePhone ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="Select a conversation" description="Choose an SMS chat, or start a new one by phone number." />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
              <p className="truncate text-sm font-semibold text-foreground">{activePhone}</p>
              {selectedChat ? (
                <LinkedLeadChip linkedLeadId={selectedChat.linked_lead_id} onOpenDialog={() => setLinkDialogOpen(true)} />
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {!selectedChat ? (
                <EmptyState title="New conversation" description="Send the first SMS below." />
              ) : messagesQuery.isLoading ? (
                <LoadingState label="Loading messages…" />
              ) : messagesQuery.isError ? (
                <ErrorState error={messagesQuery.error} onRetry={() => messagesQuery.refetch()} />
              ) : (messagesQuery.data ?? []).length === 0 ? (
                <EmptyState title="No messages yet" description="Send the first SMS below." />
              ) : (
                (messagesQuery.data ?? []).map((message) => (
                  <MessageBubbleRow key={message.id} content={message.text} direction="outbound" timestamp={message.created_at} status={message.status} />
                ))
              )}
            </div>
            <SmsComposer
              templates={templatesQuery.data ?? []}
              isSending={sendMutation.isPending}
              onSend={({ templateId, text }) => sendMutation.mutate({ phone: activePhone, templateId, text })}
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
          currentLeadId={selectedChat.linked_lead_id}
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
