"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Modal, TextField } from "@heroui/react";
import { ArrowUpRightFromSquare } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSessionStore } from "@/state/session-store";
import {
  useLeadChannelChatId,
  useLeadChannelMessagesQuery,
  useLeadChannelSendMutation,
  type LeadChatChannel,
} from "@/features/leads/hooks/useLeadChannelChat";
import { CHANNEL_ICONS } from "@/features/leads/channelIcons";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { normalizeTelegramInternalChatId } from "@/features/messages/lib/telegramDeepLink";
import type { InstagramChat, TelegramChat } from "@/features/messages/types";

const CHANNEL_LABEL: Record<LeadChatChannel, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
};

/** `/messages` deep link to the full inbox conversation — Telegram reuses
 * the `?tg_chat=&tg_msg=` params `TelegramPanel` already resolves via
 * `parseTelegramMessageDeepLink` (message id `0` never matches a real
 * message, it's only there to satisfy that parser's `chatId/msgId` shape —
 * it just selects the chat, no scroll-to-message happens). Instagram has no
 * message-level deep link, only a chat one (`?channel=instagram&ig_chat=`),
 * newly added to `InstagramPanel`'s `initialChatId` prop alongside this. */
function inboxHref(channel: LeadChatChannel, chat: TelegramChat | InstagramChat): string | null {
  if (channel === "telegram") {
    const internalId = normalizeTelegramInternalChatId((chat as TelegramChat).telegram_chat_id);
    return internalId ? `/messages?tg_chat=${internalId}&tg_msg=0` : null;
  }
  return `/messages?channel=instagram&ig_chat=${encodeURIComponent(chat.id)}`;
}

/**
 * Leads channel-chat popup — clicking the Telegram/Instagram icon on a lead
 * card or the drawer header opens this instead of navigating to the full
 * Messages inbox. Deliberately NOT `TelegramPanel`/`InstagramPanel` (those
 * own a whole page's chat-list + detail layout, stickers, canned responses,
 * agentic controls — far more than a quick reply-from-the-lead popup
 * needs); this is a small listable + writable feed, the same weight class
 * as `LeadSmsTab`. There's no "start a new conversation" path here —
 * Telegram/Instagram are inbound-first channels, so the icon only shows
 * once a chat already exists (see `channelIcons.ts`'s doc comment on
 * `connected_channels`); if the lookup still can't find one, that means the
 * matching lead-side identifier (phone/lead id) hasn't been linked to a chat
 * yet, and there's nothing to open.
 */
export function LeadChannelChatDialog({
  channel,
  leadId,
  leadPhone,
  onClose,
}: {
  channel: LeadChatChannel;
  leadId: string;
  leadPhone: string | null;
  onClose: () => void;
}) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const chatQuery = useLeadChannelChatId(channel, leadId, workspaceId, leadPhone, true);
  const chat = chatQuery.data ?? null;
  const chatId = chat?.id ?? null;
  const openInInboxHref = chat ? inboxHref(channel, chat) : null;
  const messagesQuery = useLeadChannelMessagesQuery(channel, chatId, chatQuery.isSuccess);
  const send = useLeadChannelSendMutation(channel, chatId);

  const Icon = CHANNEL_ICONS[channel];
  const label = CHANNEL_LABEL[channel];
  const messages = (messagesQuery.data ?? [])
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    setError(null);
    try {
      await send.mutateAsync(trimmed);
      setText("");
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header className="flex items-center justify-between gap-3">
              <Modal.Heading className="flex items-center gap-2">
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Modal.Heading>
              {openInInboxHref ? (
                <a
                  href={openInInboxHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-6 flex items-center gap-1.5 text-xs font-medium text-foreground/60 hover:text-foreground"
                >
                  <ArrowUpRightFromSquare className="size-3.5" aria-hidden="true" />
                  Open in {label}
                </a>
              ) : null}
            </Modal.Header>
            <Modal.Body className="flex h-[60vh] flex-col gap-3">
              {chatQuery.isLoading ? <LoadingState label="Finding conversation…" /> : null}
              {chatQuery.isError ? <ErrorState error={chatQuery.error} onRetry={() => chatQuery.refetch()} /> : null}

              {chatQuery.isSuccess && !chatId ? (
                <EmptyState title={`No ${label} conversation yet`} description={`This lead hasn't messaged in on ${label}.`} />
              ) : null}

              {chatId ? (
                <>
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-border p-3">
                    {messagesQuery.isLoading ? <LoadingState label="Loading messages…" /> : null}
                    {messagesQuery.isError ? (
                      <ErrorState error={messagesQuery.error} onRetry={() => messagesQuery.refetch()} />
                    ) : null}
                    {!messagesQuery.isLoading && !messagesQuery.isError && messages.length === 0 ? (
                      <p className="text-sm text-foreground/50">No messages yet.</p>
                    ) : null}
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                            m.direction === "outbound"
                              ? "rounded-tr-sm bg-primary text-primary-foreground"
                              : "rounded-tl-sm bg-[var(--default)] text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.text || "—"}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              m.direction === "outbound" ? "text-primary-foreground/70" : "text-foreground/40"
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {error ? (
                    <p role="alert" className="text-sm text-danger">
                      {error}
                    </p>
                  ) : null}

                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <TextField value={text} onChange={setText} className="flex-1" aria-label={`Write a ${label} message`}>
                      <Input placeholder="Write a message…" />
                    </TextField>
                    <Button type="submit" variant="primary" isDisabled={!text.trim() || send.isPending}>
                      {send.isPending ? "Sending…" : "Send"}
                    </Button>
                  </form>
                </>
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
