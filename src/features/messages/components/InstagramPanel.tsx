"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@heroui/react";
import { ChevronRight, ChevronLeft, Magnifier as Search, Sparkles } from "@gravity-ui/icons";
import { useQueryClient } from "@tanstack/react-query";

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
import {
  instagramMediaFallbackLabel,
  resolveInstagramMessageMedia,
} from "@/features/messages/lib/instagramMedia";
import { DaySeparator, groupMessagesByDay } from "@/features/messages/lib/messageDayGroups";
import { patchInstagramChatInCache } from "@/features/messages/lib/instagramChatRealtime";
import { pickAvatarColor } from "@/features/messages/lib/telegramSender";
import { instagramChatName } from "@/features/messages/types";
import type { InstagramChat } from "@/features/messages/types";
import {
  useInstagramChatsQuery,
  useInstagramLinkLeadMutation,
  useInstagramMessagesQuery,
  useInstagramRealtime,
  useInstagramSendMutation,
} from "@/features/messages/hooks/useInstagramInbox";
import {
  useAgenticSettings,
  useAgenticStatus,
  useAgentResume,
  useAgentTakeover,
  useAgenticDrafts,
  useApproveDraft,
  useRejectDraft,
  useDiscardDraft,
  useRegenerateDraft,
  useApproveAllDrafts,
  useCopilotUnseen,
  useMarkCopilotSeen,
  useSuggestReply,
} from "@/features/messages/hooks/useAgentic";
import { AgenticDraftCard } from "@/features/messages/components/agentic/AgenticDraftCard";
import { AgenticApprovalsQueue } from "@/features/messages/components/agentic/AgenticApprovalsQueue";
import { AgentCatchupBar } from "@/features/messages/components/agentic/AgentCatchupBar";
import { AgentCopilotPanel } from "@/features/messages/components/agentic/AgentCopilotPanel";
import { ChatRecapBanner } from "@/features/messages/components/agentic/ChatRecapBanner";
import { AgentThreadBars, ReplyBlockedBanner } from "@/features/messages/components/agentic/AgentThreadBars";
import { TakeoverFollowupBar } from "@/features/messages/components/agentic/TakeoverFollowupBar";
import {
  AgenticModeSettingsDialog,
  type AgenticChatLite,
} from "@/features/messages/components/agentic/AgenticModeSettingsDialog";
import { AGENT_VIOLET } from "@/features/messages/components/agentic/constants";

const AGENTIC_CHANNEL = "instagram" as const;

/**
 * Instagram customer-inbox channel. Real contract traced directly against
 * `instagram.controller.ts` (`/instagram/conversations*`,
 * `/instagram/send-message`) — see `services/api/instagramMessages.ts`.
 */
export function InstagramPanel({
  onUnreadChange,
  onChatOpenChange,
}: {
  onUnreadChange?: (count: number) => void;
  onChatOpenChange?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [agenticSettingsOpen, setAgenticSettingsOpen] = useState(false);
  const [takeoverFollowupFor, setTakeoverFollowupFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [composerSeed, setComposerSeed] = useState(0);
  const [composerInitial, setComposerInitial] = useState("");
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  const chatsQuery = useInstagramChatsQuery();
  const allChats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);

  const { data: agenticSettings } = useAgenticSettings(true, AGENTIC_CHANNEL);
  const agenticEnabled = !!agenticSettings?.enabled;
  const { data: agenticStatus } = useAgenticStatus(agenticEnabled, AGENTIC_CHANNEL);
  const replyBlocked = agenticEnabled && !!agenticStatus?.replyBlocked;

  const { data: pendingDrafts = [] } = useAgenticDrafts({ status: "pending" }, agenticEnabled, AGENTIC_CHANNEL);
  const { data: selectedChatDrafts = [] } = useAgenticDrafts(
    { chat_id: selectedChatId ?? undefined, status: "pending" },
    agenticEnabled && !!selectedChatId,
    AGENTIC_CHANNEL,
  );
  const selectedDraft = selectedChatDrafts[0] ?? null;

  const approveDraftM = useApproveDraft(AGENTIC_CHANNEL);
  const rejectDraftM = useRejectDraft(AGENTIC_CHANNEL);
  const discardDraftM = useDiscardDraft(AGENTIC_CHANNEL);
  const regenerateDraftM = useRegenerateDraft(AGENTIC_CHANNEL);
  const approveAllM = useApproveAllDrafts(AGENTIC_CHANNEL);
  const suggestReplyM = useSuggestReply(AGENTIC_CHANNEL);
  const markCopilotSeenM = useMarkCopilotSeen(selectedChatId ?? "", AGENTIC_CHANNEL);
  const copilotUnseenQ = useCopilotUnseen(selectedChatId, agenticEnabled && !!selectedChatId, AGENTIC_CHANNEL);
  const takeOverMutation = useAgentTakeover(AGENTIC_CHANNEL);
  const resumeMutation = useAgentResume(AGENTIC_CHANNEL);

  const draftsByChatId = useMemo(() => new Set(pendingDrafts.map((d) => d.chat_id)), [pendingDrafts]);

  const isAgentTargeted = useCallback(
    (chat: InstagramChat): boolean => {
      if (!agenticSettings?.enabled || chat.agentic_paused) return false;
      if (Array.isArray(agenticSettings.blocked_chat_ids) && agenticSettings.blocked_chat_ids.includes(chat.id)) {
        return false;
      }
      const targeting = agenticSettings.targeting;
      if (targeting === "everyone") return true;
      if (targeting === "selected") {
        return (Array.isArray(agenticSettings.selected_chat_ids) ? agenticSettings.selected_chat_ids : []).includes(
          chat.id,
        );
      }
      return !chat.assigned_to;
    },
    [agenticSettings],
  );

  const agentBadgeFor = useCallback(
    (chat: InstagramChat): string | null => {
      if (chat.agentic_paused) return "Human";
      if (draftsByChatId.has(chat.id)) return "Draft";
      return isAgentTargeted(chat) ? "Agent" : null;
    },
    [draftsByChatId, isAgentTargeted],
  );

  const chats = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = q ? allChats.filter((c) => instagramChatName(c).toLowerCase().includes(q)) : allChats;
    if (agenticEnabled) {
      list = [...list].sort((a, b) => {
        const aEsc = a.needs_attention ? 1 : 0;
        const bEsc = b.needs_attention ? 1 : 0;
        if (aEsc !== bEsc) return bEsc - aEsc;
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });
    }
    return list;
  }, [allChats, debouncedSearch, agenticEnabled]);

  const selectedChat = allChats.find((c) => c.id === selectedChatId) ?? null;

  const messagesQuery = useInstagramMessagesQuery(selectedChatId);
  const messages = messagesQuery.data ?? [];
  const messageDayGroups = useMemo(
    () => groupMessagesByDay(messages, (m) => m.created_at),
    [messages],
  );

  const sendMutation = useInstagramSendMutation(selectedChatId);
  const linkLeadMutation = useInstagramLinkLeadMutation();

  useInstagramRealtime(true, selectedChatId, {
    onChatDeleted: (chatId) => {
      if (selectedChatId === chatId) setSelectedChatId(null);
    },
  });

  useEffect(() => {
    const total = allChats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
    onUnreadChange?.(total);
  }, [allChats, onUnreadChange]);

  useEffect(() => {
    onChatOpenChange?.(Boolean(selectedChatId));
  }, [selectedChatId, onChatOpenChange]);

  useEffect(() => {
    if (!copilotOpen || !selectedChatId) return;
    markCopilotSeenM.mutate();
    patchInstagramChatInCache(queryClient, selectedChatId, { needs_attention: false, unseen_escalations: 0 });
  }, [copilotOpen, selectedChatId, markCopilotSeenM, queryClient]);

  const agenticChatList = useMemo<AgenticChatLite[]>(
    () =>
      allChats.map((c) => ({
        id: c.id,
        name: instagramChatName(c),
        preview: c.last_message_preview || "",
        avatarColor: pickAvatarColor(c.id),
      })),
    [allChats],
  );

  const chatInfoForAgentic = useCallback(
    (chatId: string) => {
      const c = allChats.find((x) => x.id === chatId);
      return {
        name: c ? instagramChatName(c) : "Customer",
        avatarColor: pickAvatarColor(chatId),
      };
    },
    [allChats],
  );

  const handleAgentTakeOver = useCallback(
    (chatId: string) => {
      takeOverMutation.mutate(chatId, {
        onSuccess: () => setTakeoverFollowupFor(chatId),
        onError: () => setActionError("Failed to take over from agent."),
      });
    },
    [takeOverMutation],
  );

  const handleAgentResume = useCallback(
    (chatId: string) => {
      resumeMutation.mutate(chatId, {
        onError: () => setActionError("Failed to resume agent."),
      });
    },
    [resumeMutation],
  );

  const selectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    setActionError(null);
    setApprovalsOpen(false);
    setComposerInitial("");
    setTakeoverFollowupFor(null);
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      sendMutation.mutate(text, {
        onError: () => setActionError("Failed to send. Try again."),
      });
    },
    [sendMutation],
  );

  const draftBusy =
    approveDraftM.isPending || regenerateDraftM.isPending || discardDraftM.isPending || approveAllM.isPending;

  const customerName = selectedChat ? instagramChatName(selectedChat) : "Customer";

  return (
    <div className="flex min-h-0 flex-1">
      <div className={`${selectedChatId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-black/[0.06] md:w-80 dark:border-white/10`}>
        <div className="flex flex-col gap-2 border-b border-black/[0.06] p-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => setAgenticSettingsOpen(true)}
            className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/10 px-3 text-xs font-semibold text-foreground/80 hover:bg-[var(--default)] dark:border-white/10"
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {agenticEnabled
                  ? `Agent on · ${agenticSettings?.response_mode === "auto" ? "Auto" : "Manual"}`
                  : "Set up Agent Mode"}
              </span>
            </span>
            <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
          </button>

          {agenticEnabled && pendingDrafts.length > 0 ? (
            <button
              type="button"
              onClick={() => setApprovalsOpen(true)}
              className="flex h-9 w-full items-center justify-between gap-2 rounded-lg px-3 text-xs font-semibold text-white"
              style={{ backgroundColor: AGENT_VIOLET }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Review drafts
              </span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{pendingDrafts.length}</span>
            </button>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
            <Input aria-label="Search Instagram chats" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats…" className="pl-8" fullWidth />
          </div>
        </div>

        {agenticEnabled ? <AgentCatchupBar channel={AGENTIC_CHANNEL} onOpenChat={selectChat} /> : null}
        {replyBlocked ? <ReplyBlockedBanner botUsername={agenticStatus?.botUsername} /> : null}

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
                  onSelect={selectChat}
                  attention={!!chat.needs_attention}
                  agentBadge={agentBadgeFor(chat)}
                  agentBadgeIsHuman={!!chat.agentic_paused}
                  closed={!!chat.conversation_closed_at}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`${!selectedChatId ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-1`}>
        {!selectedChat ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="Select a conversation" description="Choose an Instagram chat from the list to view messages." />
          </div>
        ) : approvalsOpen ? (
          <AgenticApprovalsQueue
            channel={AGENTIC_CHANNEL}
            drafts={pendingDrafts}
            chatInfo={chatInfoForAgentic}
            busy={draftBusy}
            onApprove={(id) =>
              approveDraftM.mutate({ id }, { onError: () => setActionError("Failed to approve draft.") })
            }
            onReject={(id) => rejectDraftM.mutate(id, { onError: () => setActionError("Failed to reject draft.") })}
            onApproveAll={() =>
              approveAllM.mutate(undefined, { onError: () => setActionError("Failed to approve all drafts.") })
            }
            onEdit={(draft) => {
              setApprovalsOpen(false);
              selectChat(draft.chat_id);
            }}
            onClose={() => setApprovalsOpen(false)}
          />
        ) : (
          <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label="Back to chat list"
                    onClick={() => setSelectedChatId(null)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-foreground/60 hover:bg-[var(--default)] hover:text-foreground md:hidden"
                  >
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </button>
                  <p className="truncate text-sm font-semibold text-foreground">{instagramChatName(selectedChat)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {agenticEnabled ? (
                    <button
                      type="button"
                      onClick={() => setCopilotOpen((v) => !v)}
                      className={`relative inline-flex size-9 items-center justify-center rounded-full transition-colors ${
                        copilotOpen ? "text-white" : "text-foreground/50 hover:bg-[var(--default)]"
                      }`}
                      style={copilotOpen ? { backgroundColor: AGENT_VIOLET } : undefined}
                      aria-label="Agent chat"
                      aria-pressed={copilotOpen}
                    >
                      <Sparkles className="size-4" aria-hidden="true" />
                      {(copilotUnseenQ.data?.count ?? 0) > 0 && !copilotOpen ? (
                        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[#F59E0B] ring-2 ring-background" />
                      ) : null}
                    </button>
                  ) : null}
                  <LinkedLeadChip linkedLeadId={selectedChat.linked_lead_id ?? null} onOpenDialog={() => setLinkDialogOpen(true)} />
                </div>
              </div>

              {replyBlocked ? <ReplyBlockedBanner botUsername={agenticStatus?.botUsername} /> : null}
              {agenticEnabled ? <ChatRecapBanner key={selectedChat.id} chatId={selectedChat.id} channel={AGENTIC_CHANNEL} /> : null}
              {takeoverFollowupFor === selectedChat.id ? (
                <TakeoverFollowupBar
                  chatId={selectedChat.id}
                  channel={AGENTIC_CHANNEL}
                  busy={sendMutation.isPending}
                  onSend={(text) => {
                    handleSend(text);
                    setTakeoverFollowupFor(null);
                  }}
                  onEdit={(text) => {
                    setComposerInitial(text);
                    setComposerSeed((s) => s + 1);
                    setTakeoverFollowupFor(null);
                  }}
                  onDismiss={() => setTakeoverFollowupFor(null)}
                />
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto py-2">
                {messagesQuery.isLoading ? (
                  <LoadingState label="Loading messages…" />
                ) : messagesQuery.isError ? (
                  <ErrorState error={messagesQuery.error} onRetry={() => messagesQuery.refetch()} />
                ) : messages.length === 0 ? (
                  <EmptyState title="No messages yet" description="Send the first message below." />
                ) : (
                  messageDayGroups.map((group) => (
                    <div key={group.label}>
                      <DaySeparator label={group.label} />
                      {group.items.map((message) => {
                        const caption = (message.text_content || "").trim();
                        const media = resolveInstagramMessageMedia(message);
                        const hasMedia = Boolean(media.kind && (media.url || (media.kind === "link" && media.linkLabel)));
                        const fallback = hasMedia ? "" : instagramMediaFallbackLabel(message.message_type);
                        const isAgentMsg = message.direction === "outbound" && message.metadata?.ai_generated === true;
                        return (
                          <MessageBubbleRow
                            key={message.id}
                            content={caption || fallback}
                            direction={message.direction}
                            timestamp={message.created_at}
                            status={message.status}
                            mediaUrl={hasMedia ? media.url : null}
                            mediaKind={hasMedia ? media.kind : null}
                            mediaLayout={media.layout}
                            mediaPosterUrl={hasMedia ? media.posterUrl : null}
                            mediaLinkLabel={media.linkLabel}
                            agentGenerated={isAgentMsg}
                            agentVoiceDurationSec={message.metadata?.voice_duration_sec ?? null}
                          />
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              <AgentThreadBars
                chat={selectedChat}
                agenticEnabled={agenticEnabled}
                agenticSettings={agenticSettings}
                isTargeted={isAgentTargeted(selectedChat)}
                hasPendingDraft={!!selectedDraft}
                busy={takeOverMutation.isPending || resumeMutation.isPending}
                onTakeOver={() => handleAgentTakeOver(selectedChat.id)}
                onResume={() => handleAgentResume(selectedChat.id)}
              />

              {selectedDraft && agenticEnabled ? (
                <AgenticDraftCard
                  draft={selectedDraft}
                  customerName={customerName}
                  busy={draftBusy}
                  onApprove={(text, isVoice) =>
                    approveDraftM.mutate(
                      { id: selectedDraft.id, text, is_voice: isVoice },
                      { onError: () => setActionError("Failed to approve draft.") },
                    )
                  }
                  onRegenerate={() =>
                    regenerateDraftM.mutate(selectedDraft.id, {
                      onError: () => setActionError("Failed to regenerate draft."),
                    })
                  }
                  onDiscard={() =>
                    discardDraftM.mutate(selectedDraft.id, {
                      onError: () => setActionError("Failed to discard draft."),
                    })
                  }
                />
              ) : null}

              <TextComposer
                key={composerSeed}
                onSend={handleSend}
                isSending={sendMutation.isPending}
                disabled={Boolean(selectedChat.conversation_closed_at)}
                disabledReason={selectedChat.conversation_closed_at ? "This conversation is marked closed." : undefined}
                initialValue={composerInitial}
                leadingActions={
                  agenticEnabled && isAgentTargeted(selectedChat) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedChat || aiSuggestLoading) return;
                        setAiSuggestLoading(true);
                        suggestReplyM.mutate(selectedChat.id, {
                          onSuccess: (data) => {
                            if (data.text) {
                              setComposerInitial(data.text);
                              setComposerSeed((s) => s + 1);
                            } else setActionError("No suggestion available.");
                          },
                          onError: () => setActionError("Failed to get AI suggestion."),
                          onSettled: () => setAiSuggestLoading(false),
                        });
                      }}
                      disabled={Boolean(selectedChat.conversation_closed_at) || aiSuggestLoading}
                      aria-label="AI suggest reply"
                      className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-[#7C3AED] hover:bg-[#7C3AED]/10 disabled:opacity-40"
                    >
                      <Sparkles className={`size-[18px] ${aiSuggestLoading ? "animate-pulse" : ""}`} aria-hidden="true" />
                    </button>
                  ) : null
                }
              />

              {sendMutation.isError || actionError ? (
                <p role="alert" className="px-4 pb-2 text-xs text-danger">
                  {actionError ?? "Failed to send. Try again."}
                </p>
              ) : null}
            </div>

            {copilotOpen && agenticEnabled && selectedChat ? (
              <AgentCopilotPanel
                chatId={selectedChat.id}
                chatName={instagramChatName(selectedChat)}
                workspaceId={workspaceId}
                channel={AGENTIC_CHANNEL}
                agentEnabled={agenticEnabled}
                paused={!!selectedChat.agentic_paused}
                targeted={isAgentTargeted(selectedChat)}
                busyToggle={takeOverMutation.isPending || resumeMutation.isPending}
                onTakeOver={() => handleAgentTakeOver(selectedChat.id)}
                onResume={() => handleAgentResume(selectedChat.id)}
                onClose={() => setCopilotOpen(false)}
              />
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

      <AgenticModeSettingsDialog
        isOpen={agenticSettingsOpen}
        onClose={() => setAgenticSettingsOpen(false)}
        channel={AGENTIC_CHANNEL}
        chats={agenticChatList}
        onOpenChat={(chatId) => {
          setAgenticSettingsOpen(false);
          selectChat(chatId);
        }}
      />
    </div>
  );
}
