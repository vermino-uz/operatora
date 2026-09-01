"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@heroui/react";
import {
  Copy,
  FaceRobot,
  Magnifier as Search,
  SquareXmark,
  TrashBin,
  ArrowShapeTurnUpRight as Forward,
  ArrowRightFromSquare,
  Person,
  ChevronDown,
} from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDebounce } from "@/hooks/useDebounce";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/state/session-store";
import { useMyWorkspacePermissionsQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import { useCannedResponsesQuery } from "@/features/canned-responses/hooks/useCannedResponses";
import { useTelegramIntegrationsQuery } from "@/features/telegram/hooks/useTelegramIntegrations";
import { filterCannedByChannel } from "@/features/messages/lib/cannedResponses";
import { ConversationListItem } from "@/features/messages/components/ConversationListItem";
import { MessageBubbleRow } from "@/features/messages/components/MessageBubbleRow";
import { PhotoLightbox, type PhotoLightboxItem } from "@/features/messages/components/PhotoLightbox";
import { TelegramMessageMenu } from "@/features/messages/components/TelegramMessageMenu";
import { ForwardMessageDialog } from "@/features/messages/components/ForwardMessageDialog";
import { TelegramDeleteMessagesDialog, type TelegramDeleteScope } from "@/features/messages/components/TelegramDeleteMessagesDialog";
import { ConnectTelegramAccountDialog } from "@/features/messages/components/ConnectTelegramAccountDialog";
import { TelegramAccountDisconnectDialog } from "@/features/messages/components/TelegramAccountDisconnectDialog";
import { TelegramPanelSettingsMenu } from "@/features/messages/components/TelegramPanelSettingsMenu";
import { TelegramStartChatDialog } from "@/features/messages/components/TelegramStartChatDialog";
import { TelegramGroupTopicsBar } from "@/features/messages/components/TelegramGroupTopicsBar";
import { TextComposer } from "@/features/messages/components/TextComposer";
import { LinkedLeadChip } from "@/features/messages/components/LinkedLeadChip";
import { LinkLeadDialog } from "@/features/messages/components/LinkLeadDialog";
import { downloadTelegramMedia } from "@/services/api/telegramMessages";
import { telegramAccountApi } from "@/services/api/telegramAccount";
import {
  isTelegramRenderableMediaKind,
  resolveTelegramMessageKind,
  resolveTelegramMessageThumbnailFileId,
  telegramMediaFallbackLabel,
} from "@/features/messages/lib/telegramMedia";
import { resolveTelegramMessageSender } from "@/features/messages/lib/telegramSender";
import { buildTelegramMessageLink } from "@/features/messages/lib/telegramMessageLink";
import { isTelegramGroupLikeChat } from "@/features/messages/lib/telegramUserAvatar";
import {
  formatTelegramLastSeen,
  isTelegramChannelChat,
  isTelegramGroupChat,
  isTelegramPrivateChat,
  telegramChatAvatarUrl,
  telegramChatName,
  telegramMessageMediaUrl,
  type TelegramChat,
  type TelegramForumTopic,
  type TelegramMessage,
} from "@/features/messages/types";
import {
  filterTelegramMessagesByTopic,
  pickDefaultForumTopic,
} from "@/features/messages/lib/telegramTopics";
import type { PhoneNumberActions } from "@/features/messages/lib/phoneNumber";
import {
  useTelegramChatsQuery,
  useTelegramDeleteMutation,
  useTelegramEditMutation,
  useTelegramForwardMutation,
  useTelegramLinkLeadMutation,
  useTelegramMarkReadMutation,
  useTelegramMessagesQuery,
  useTelegramReactionMutation,
  useTelegramRealtime,
  useTelegramSendMutation,
  useTelegramSyncHistoryMutation,
  USER_ACCOUNT_CHAT_PREFETCH_TARGET,
  CHAT_OPEN_HISTORY_SYNC_LIMIT,
} from "@/features/messages/hooks/useTelegramInbox";
import {
  useTelegramAccountFoldersQuery,
  useTelegramAccountSettingsQuery,
  useTelegramAccountSyncMutation,
  useTelegramAccountDisconnectMutation,
  useTelegramStartChatMutation,
  useTelegramAccountAddContactMutation,
} from "@/features/messages/hooks/useTelegramAccount";
import { useTelegramGroupTopicsQuery } from "@/features/messages/hooks/useTelegramGroupTopics";

type ConnectionMode = "business_bot" | "user_account";
type ChatScope = "all" | "private" | "groups" | "channels" | number;

/** Load the next chat page when the list is within this many px of the bottom. */
const CHAT_LIST_SCROLL_THRESHOLD_PX = 400;
/** Auto-load older messages when the thread is scrolled near the top. */
const MESSAGES_SCROLL_TOP_THRESHOLD_PX = 120;
/** Show the jump-to-bottom control when scrolled farther than this from the end. */
const MESSAGES_SCROLL_BOTTOM_THRESHOLD_PX = 96;
/** Client-side folder/type filters run on loaded pages only — prefetch more when the visible list is still short. */
const CHAT_LIST_MIN_VISIBLE = 30;

function truncateQuote(text: string): string {
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

function isMessagesNearBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= MESSAGES_SCROLL_BOTTOM_THRESHOLD_PX;
}

function messageCopyLine(m: TelegramMessage): string | null {
  const text = (m.text_content || "").trim();
  if (text) return text;
  const kind = m.message_kind || "message";
  return kind !== "text" ? `[${kind}]` : null;
}

export function TelegramPanel({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const prevAccountSessionIdRef = useRef<string | null>(null);
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const currentUserId = useSessionStore((s) => s.user?.id);
  const permissionsQuery = useMyWorkspacePermissionsQuery(workspaceId);
  const canManageAccount =
    permissionsQuery.data?.workspace_role === "workspace_owner" || permissionsQuery.data?.workspace_role === "owner";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [chatScope, setChatScope] = useState<ChatScope>("all");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [startChatOpen, setStartChatOpen] = useState(false);
  const [lastSeenLabel, setLastSeenLabel] = useState<string | null>(null);
  const [syncingHistory, setSyncingHistory] = useState(false);

  const [replyTo, setReplyTo] = useState<TelegramMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forwardMessageIds, setForwardMessageIds] = useState<string[] | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [isDeletingMessages, setIsDeletingMessages] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState<number | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [selectedForumTopic, setSelectedForumTopic] = useState<TelegramForumTopic | null>(null);
  const [showGoToBottom, setShowGoToBottom] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);

  const accountSettingsQuery = useTelegramAccountSettingsQuery(workspaceId);
  const integrationsQuery = useTelegramIntegrationsQuery(workspaceId);
  const accountSession = accountSettingsQuery.data?.session;
  const connectionMode: ConnectionMode =
    accountSettingsQuery.data?.connection_mode === "user_account" ? "user_account" : "business_bot";
  const hasLinkedSession = connectionMode === "user_account" && Boolean(accountSession);
  const accountActive = hasLinkedSession && accountSession?.status === "active";
  const accountProtocol = accountSettingsQuery.data?.protocol ?? "pyrogram";
  const linkedAccountLabel = useMemo(() => {
    const session = accountSession;
    if (!session) return "Linked account";
    const name = [session.first_name, session.last_name].filter(Boolean).join(" ").trim();
    if (name) return name;
    if (session.telegram_username) return `@${session.telegram_username}`;
    return session.phone_masked || "Linked account";
  }, [accountSession]);

  const foldersQuery = useTelegramAccountFoldersQuery(workspaceId, connectionMode === "user_account" && accountActive);
  const cannedQuery = useCannedResponsesQuery(workspaceId);
  const cannedResponses = useMemo(
    () => filterCannedByChannel(cannedQuery.data ?? [], "telegram"),
    [cannedQuery.data],
  );

  const chatsQuery = useTelegramChatsQuery(workspaceId, debouncedSearch, connectionMode);
  const rawChats = useMemo(() => {
    const list = chatsQuery.chats;
    if (connectionMode !== "user_account" || !accountSession?.id) return list;
    return list.filter((chat) => chat.user_session_id === accountSession.id);
  }, [chatsQuery.chats, connectionMode, accountSession?.id]);
  const accountSync = useTelegramAccountSyncMutation(workspaceId);
  const accountDisconnect = useTelegramAccountDisconnectMutation(workspaceId);
  const startChatByPhone = useTelegramStartChatMutation(workspaceId);
  const addContactMutation = useTelegramAccountAddContactMutation();

  const handleAccountConnected = useCallback(async () => {
    setConnectDialogOpen(false);
    setSelectedChatId(null);
    setChatScope("all");
    const settings = await accountSettingsQuery.refetch();
    if (workspaceId) {
      await queryClient.invalidateQueries({ queryKey: ["telegram-chats", workspaceId] });
      await queryClient.removeQueries({ queryKey: ["telegram-chats", workspaceId, "business_bot"] });
    }
    if (settings.data?.connection_mode === "user_account") {
      if (settings.data.session?.id) {
        prevAccountSessionIdRef.current = settings.data.session.id;
      }
      try {
        await accountSync.mutateAsync();
      } catch {
        /* initial sync after link is best-effort */
      }
    }
  }, [accountSettingsQuery, accountSync, queryClient, workspaceId]);

  const filteredChats = useMemo(() => {
    let list = rawChats;
    if (chatScope === "private") list = list.filter((c) => isTelegramPrivateChat(c));
    else if (chatScope === "groups") list = list.filter((c) => isTelegramGroupChat(c));
    else if (chatScope === "channels") list = list.filter((c) => isTelegramChannelChat(c));
    else if (typeof chatScope === "number") {
      list = list.filter((c) => Array.isArray(c.folder_ids) && c.folder_ids.includes(chatScope));
    }
    return list;
  }, [rawChats, chatScope]);

  const selectedChat = filteredChats.find((c) => c.id === selectedChatId) ?? rawChats.find((c) => c.id === selectedChatId) ?? null;

  const showForumTopics =
    connectionMode === "user_account" &&
    accountActive &&
    accountProtocol === "tdlib" &&
    Boolean(selectedChat && isTelegramGroupChat(selectedChat));
  const topicsQuery = useTelegramGroupTopicsQuery(selectedChatId, showForumTopics);
  const forumTopics = topicsQuery.data;

  const messagesQuery = useTelegramMessagesQuery(selectedChatId);
  const allMessages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const messages = useMemo(
    () => (showForumTopics && selectedForumTopic ? filterTelegramMessagesByTopic(allMessages, selectedForumTopic) : allMessages),
    [allMessages, selectedForumTopic, showForumTopics],
  );

  const chatPhotoItems = useMemo((): PhotoLightboxItem[] => {
    if (!selectedChat) return [];
    const items: PhotoLightboxItem[] = [];
    for (const m of messages) {
      if (resolveTelegramMessageKind(m) !== "photo") continue;
      const url = telegramMessageMediaUrl(m, selectedChat);
      if (!url) continue;
      const caption = (m.text_content || "").trim();
      items.push({ id: m.id, url, ...(caption ? { caption } : {}) });
    }
    return items;
  }, [messages, selectedChat]);

  const openPhotoLightbox = useCallback(
    (messageId: string) => {
      const idx = chatPhotoItems.findIndex((p) => p.id === messageId);
      if (idx >= 0) setPhotoLightboxIndex(idx);
    },
    [chatPhotoItems],
  );
  const syncHistoryMutation = useTelegramSyncHistoryMutation(workspaceId);
  const sendMutation = useTelegramSendMutation(selectedChatId);
  const editMutation = useTelegramEditMutation(selectedChatId);
  const deleteMutation = useTelegramDeleteMutation(selectedChatId);
  const reactionMutation = useTelegramReactionMutation(selectedChatId);
  const forwardMutation = useTelegramForwardMutation(workspaceId);
  const markReadMutation = useTelegramMarkReadMutation(workspaceId);
  const linkLeadMutation = useTelegramLinkLeadMutation(workspaceId);

  const handleChatListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (
        el.scrollHeight - el.scrollTop - el.clientHeight < CHAT_LIST_SCROLL_THRESHOLD_PX &&
        chatsQuery.hasNextPage &&
        !chatsQuery.isFetchingNextPage
      ) {
        void chatsQuery.fetchNextPage();
      }
    },
    [chatsQuery.fetchNextPage, chatsQuery.hasNextPage, chatsQuery.isFetchingNextPage],
  );

  // Linked account: prefetch up to 500 chats; folder/type tabs also pull more when the filtered list is sparse.
  useEffect(() => {
    if (chatsQuery.isLoading || chatsQuery.isFetchingNextPage || !chatsQuery.hasNextPage) return;
    if (connectionMode === "user_account" && accountActive && rawChats.length < USER_ACCOUNT_CHAT_PREFETCH_TARGET) {
      void chatsQuery.fetchNextPage();
      return;
    }
    if (filteredChats.length >= CHAT_LIST_MIN_VISIBLE) return;
    void chatsQuery.fetchNextPage();
  }, [
    accountActive,
    chatScope,
    connectionMode,
    filteredChats.length,
    rawChats.length,
    chatsQuery.fetchNextPage,
    chatsQuery.hasNextPage,
    chatsQuery.isFetchingNextPage,
    chatsQuery.isLoading,
  ]);

  useTelegramRealtime(workspaceId, selectedChatId);

  useEffect(() => {
    setPhotoLightboxIndex(null);
  }, [selectedChatId]);

  const hasBotIntegrations = (integrationsQuery.data ?? []).some((bot) => bot.is_active);
  const initialLoadDone =
    !accountSettingsQuery.isLoading && !integrationsQuery.isLoading && !chatsQuery.isLoading;
  const hasTelegramConnection = hasLinkedSession || hasBotIntegrations || rawChats.length > 0;

  useEffect(() => {
    setSelectedChatId(null);
    setChatScope("all");
    setReplyTo(null);
    setEditingId(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setForwardMessageIds(null);
    setActionError(null);
  }, [connectionMode]);

  useEffect(() => {
    const sessionId = accountSession?.id ?? null;
    if (!workspaceId || !accountActive || !sessionId) {
      if (!sessionId) prevAccountSessionIdRef.current = null;
      return;
    }
    const prev = prevAccountSessionIdRef.current;
    if (prev !== null && prev !== sessionId) {
      void queryClient.invalidateQueries({ queryKey: ["telegram-chats", workspaceId] });
      void accountSync.mutateAsync().catch(() => undefined);
    }
    prevAccountSessionIdRef.current = sessionId;
  }, [accountActive, accountSession?.id, accountSync, queryClient, workspaceId]);

  const connectDialog =
    connectDialogOpen && workspaceId ? (
      <ConnectTelegramAccountDialog
        canManage={canManageAccount}
        hasActiveSession={hasLinkedSession}
        initialProtocol={accountProtocol}
        onConnected={() => void handleAccountConnected()}
        onClose={() => setConnectDialogOpen(false)}
      />
    ) : null;

  useEffect(() => {
    const total = rawChats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
    onUnreadChange?.(total);
  }, [rawChats, onUnreadChange]);

  useEffect(() => {
    if (selectedChatId && (selectedChat?.unread_count ?? 0) > 0 && !markReadMutation.isPending) {
      markReadMutation.mutate(selectedChatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId]);

  function selectChat(chatId: string) {
    setSelectedChatId(chatId);
    setReplyTo(null);
    setEditingId(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setActionError(null);
    setLastSeenLabel(null);
    setSyncingHistory(false);
    setHistoryHasMore(false);
    setSelectedForumTopic(null);

    const chat = rawChats.find((c) => c.id === chatId);
    const deferGroupHistorySync =
      connectionMode === "user_account" &&
      accountActive &&
      accountProtocol === "tdlib" &&
      Boolean(chat && isTelegramGroupChat(chat));

    if (connectionMode === "user_account" && accountActive && !deferGroupHistorySync) {
      setSyncingHistory(true);
      void syncHistoryMutation
        .mutateAsync({ chatId, limit: CHAT_OPEN_HISTORY_SYNC_LIMIT })
        .then((data) => setHistoryHasMore(Boolean(data?.has_more)))
        .catch(() => {
          /* first-open sync is best-effort */
        })
        .finally(() => setSyncingHistory(false));

      if (!chat?.chat_type || chat.chat_type === "private") {
        void telegramAccountApi.getLastSeen(chatId).then((data) => {
          setLastSeenLabel(formatTelegramLastSeen(data));
        }).catch(() => {
          /* optional header detail */
        });
      }
    } else if (connectionMode === "user_account" && accountActive && chat && (!chat.chat_type || chat.chat_type === "private")) {
      void telegramAccountApi.getLastSeen(chatId).then((data) => {
        setLastSeenLabel(formatTelegramLastSeen(data));
      }).catch(() => {
        /* optional header detail */
      });
    }
  }

  const phoneActions: PhoneNumberActions | null = accountActive
    ? {
        onCreateContact: (phone) => {
          void addContactMutation.mutateAsync({ phone }).catch(() => {
            setActionError("Couldn't add contact.");
          });
        },
        onOpenTelegramDm: (phone) => {
          void startChatByPhone
            .mutateAsync({ kind: "phone", phone })
            .then((result) => {
              const chatId = result.chat?.id;
              if (!chatId) throw new Error("Chat opened but no id returned.");
              selectChat(chatId);
              void chatsQuery.refetch();
            })
            .catch(() => {
              setActionError("Couldn't open Telegram chat.");
            });
        },
      }
    : null;

  useEffect(() => {
    if (!selectedChatId || !showForumTopics) return;
    if (topicsQuery.isLoading) return;

    if (forumTopics === undefined) return;

    if (forumTopics === null) {
      setSyncingHistory(true);
      void syncHistoryMutation
        .mutateAsync({ chatId: selectedChatId, limit: CHAT_OPEN_HISTORY_SYNC_LIMIT })
        .then((data) => setHistoryHasMore(Boolean(data?.has_more)))
        .catch(() => undefined)
        .finally(() => setSyncingHistory(false));
      return;
    }

    if (!forumTopics.length) return;

    if (!selectedForumTopic) {
      setSelectedForumTopic(pickDefaultForumTopic(forumTopics));
      return;
    }

    setSyncingHistory(true);
    void syncHistoryMutation
      .mutateAsync({
        chatId: selectedChatId,
        limit: CHAT_OPEN_HISTORY_SYNC_LIMIT,
        forumTopicId: selectedForumTopic.forum_topic_id,
      })
      .then((data) => setHistoryHasMore(Boolean(data?.has_more)))
      .catch(() => undefined)
      .finally(() => setSyncingHistory(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when chat/topic resolves, not on every mutation identity change
  }, [selectedChatId, showForumTopics, topicsQuery.isLoading, forumTopics, selectedForumTopic?.forum_topic_id]);

  function selectForumTopic(topic: TelegramForumTopic) {
    if (selectedForumTopic?.forum_topic_id === topic.forum_topic_id) return;
    setSelectedForumTopic(topic);
    setReplyTo(null);
    setHistoryHasMore(false);
  }

  function handleForumTopicDeleted(topicId: number) {
    if (selectedForumTopic?.forum_topic_id !== topicId) return;
    const fallback = forumTopics ? pickDefaultForumTopic(forumTopics.filter((t) => t.forum_topic_id !== topicId)) : null;
    setSelectedForumTopic(fallback);
    setHistoryHasMore(false);
  }

  const customerName = selectedChat ? telegramChatName(selectedChat) : "Customer";
  const isAccountChat = Boolean(
    selectedChat && (selectedChat.source === "user_account" || selectedChat.user_session_id),
  );
  const isChannelBroadcast = Boolean(selectedChat && isTelegramChannelChat(selectedChat));

  const loadOlderHistory = useCallback(async () => {
    if (!selectedChat || syncingHistory || loadingOlderRef.current) return;
    if (!isAccountChat) {
      await messagesQuery.refetch();
      return;
    }
    if (!historyHasMore) return;

    const oldestTelegramId = messages.reduce<number | null>((min, m) => {
      const id = m.telegram_message_id;
      if (id == null || !Number.isFinite(Number(id))) return min;
      const num = Number(id);
      return min == null || num < min ? num : min;
    }, null);

    const scrollEl = messagesScrollRef.current;
    const prevHeight = scrollEl?.scrollHeight ?? 0;

    loadingOlderRef.current = true;
    setSyncingHistory(true);
    try {
      const data = await syncHistoryMutation.mutateAsync({
        chatId: selectedChat.id,
        limit: CHAT_OPEN_HISTORY_SYNC_LIMIT,
        offsetId: oldestTelegramId ?? undefined,
        forumTopicId: selectedForumTopic?.forum_topic_id,
      });
      setHistoryHasMore(Boolean(data?.has_more));
      requestAnimationFrame(() => {
        if (scrollEl) {
          scrollEl.scrollTop = scrollEl.scrollHeight - prevHeight;
          setShowGoToBottom(!isMessagesNearBottom(scrollEl));
        }
      });
    } catch {
      setActionError("Couldn't load older messages.");
    } finally {
      setSyncingHistory(false);
      loadingOlderRef.current = false;
    }
  }, [historyHasMore, isAccountChat, messages, messagesQuery, selectedChat, selectedForumTopic, syncHistoryMutation, syncingHistory]);

  const handleMessagesScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      setShowGoToBottom(!isMessagesNearBottom(el));

      if (!historyHasMore || syncingHistory || loadingOlderRef.current || !isAccountChat) return;
      if (el.scrollTop <= MESSAGES_SCROLL_TOP_THRESHOLD_PX) {
        void loadOlderHistory();
      }
    },
    [historyHasMore, isAccountChat, loadOlderHistory, syncingHistory],
  );

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setShowGoToBottom(false);
  }, []);

  useEffect(() => {
    if (showGoToBottom) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, showGoToBottom]);

  useEffect(() => {
    setShowGoToBottom(false);
    requestAnimationFrame(() => {
      const el = messagesScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [selectedChatId]);

  function getReplyQuote(m: TelegramMessage): { author: string; text: string } | undefined {
    const stored = m.metadata?.reply_preview;
    if (stored?.text) return { author: stored.author || "…", text: truncateQuote(stored.text) };
    const rid = m.reply_to_message_id;
    if (rid == null) return undefined;
    const parent = messages.find((msg) => msg.telegram_message_id === rid);
    if (!parent) return undefined;
    const text = (parent.text_content || "").trim() || `[${parent.message_kind || "message"}]`;
    const author = parent.direction === "outbound" ? "You" : customerName;
    return { author, text: truncateQuote(text) };
  }

  function clearMessageActions() {
    setReplyTo(null);
    setEditingId(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setForwardMessageIds(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleComposerSend(text: string) {
    if (!selectedChat) return;
    if (editingId) {
      editMutation.mutate(
        { messageId: editingId, text },
        {
          onSuccess: () => setEditingId(null),
          onError: () => setActionError("Failed to save the edit. Try again."),
        },
      );
      return;
    }
    const replyId = replyTo?.telegram_message_id ?? null;
    sendMutation.mutate({
      text,
      senderId: currentUserId,
      replyToMessageId: replyId,
      forumTopicId: selectedForumTopic?.forum_topic_id,
      replyPreview: replyTo
        ? { author: replyTo.direction === "outbound" ? "You" : customerName, text: messageCopyLine(replyTo) ?? "[message]" }
        : undefined,
    });
    setReplyTo(null);
  }

  async function handleCopy(m: TelegramMessage) {
    const text = (m.text_content || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setActionError("Couldn't copy — clipboard access was blocked.");
    }
  }

  async function handleCopyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      setActionError("Couldn't copy — clipboard access was blocked.");
    }
  }

  async function handleSaveImage(m: TelegramMessage) {
    if (!selectedChat) return;
    const mediaUrl = telegramMessageMediaUrl(m, selectedChat);
    if (!mediaUrl) return;
    const base = m.telegram_message_id != null ? String(m.telegram_message_id) : m.id.replace(/[^a-z0-9-]/gi, "").slice(0, 12);
    const ext = m.message_kind === "sticker" ? "webp" : "jpg";
    try {
      await downloadTelegramMedia(mediaUrl, `telegram-${base}.${ext}`);
    } catch {
      setActionError("Failed to save the image. Try again.");
    }
  }

  function handleReply(m: TelegramMessage) {
    if (!m.telegram_message_id) {
      setActionError("Can't reply to this message — it has no Telegram id yet.");
      return;
    }
    setEditingId(null);
    setReplyTo(m);
  }

  function handleEdit(m: TelegramMessage) {
    setReplyTo(null);
    setEditingId(m.id);
  }

  function handleReact(m: TelegramMessage, emoji: string | null) {
    if (m.id.startsWith("optimistic-") || !m.telegram_message_id) {
      setActionError("Can't react to this message yet.");
      return;
    }
    reactionMutation.mutate({ messageId: m.id, emoji }, { onError: () => setActionError("Failed to update the reaction.") });
  }

  function openDeleteDialog(ids: string[]) {
    const valid = ids.filter((id) => !id.startsWith("optimistic-"));
    if (!valid.length) return;
    setPendingDeleteIds(valid);
    setDeleteDialogOpen(true);
  }

  function handleDelete(m: TelegramMessage) {
    if (m.id.startsWith("optimistic-")) return;
    openDeleteDialog([m.id]);
  }

  function handleStartSelect(m: TelegramMessage) {
    setReplyTo(null);
    setEditingId(null);
    setSelectionMode(true);
    setSelectedIds(new Set([m.id]));
  }

  function canForward(m: TelegramMessage): boolean {
    return !m.id.startsWith("optimistic-") && (Boolean(m.telegram_message_id) || Boolean((m.text_content || "").trim()) || Boolean(m.file_id));
  }

  function openForward(ids: string[]) {
    const valid = ids.filter((id) => !id.startsWith("optimistic-"));
    if (!valid.length) {
      setActionError("Nothing here can be forwarded yet.");
      return;
    }
    setForwardMessageIds(valid);
  }

  async function handleForwardSubmit(targetChatId: string) {
    if (!selectedChat || !forwardMessageIds) return;
    await forwardMutation.mutateAsync({
      sourceChatId: selectedChat.id,
      targetChatId,
      messageIds: forwardMessageIds,
      senderId: currentUserId,
    });
    clearMessageActions();
  }

  async function handleBulkCopy() {
    const lines = messages
      .filter((m) => selectedIds.has(m.id))
      .map(messageCopyLine)
      .filter((line): line is string => Boolean(line));
    if (!lines.length) return;
    try {
      await navigator.clipboard.writeText(lines.join("\n\n"));
      clearMessageActions();
    } catch {
      setActionError("Couldn't copy — clipboard access was blocked.");
    }
  }

  function handleBulkForward() {
    const ids = messages.filter((m) => selectedIds.has(m.id) && canForward(m)).map((m) => m.id);
    openForward(ids);
  }

  function handleBulkDelete() {
    openDeleteDialog([...selectedIds]);
  }

  async function handleDeleteConfirm(scope: TelegramDeleteScope) {
    if (!pendingDeleteIds.length) return;
    const revoke = scope === "everyone";
    setIsDeletingMessages(true);
    let failed = 0;
    for (const id of pendingDeleteIds) {
      try {
        await deleteMutation.mutateAsync({ messageId: id, revoke });
      } catch {
        failed += 1;
      }
    }
    setIsDeletingMessages(false);
    setDeleteDialogOpen(false);
    setPendingDeleteIds([]);
    clearMessageActions();
    if (failed) {
      setActionError(`${failed} message${failed === 1 ? "" : "s"} failed to delete.`);
    }
  }

  const emptyDescription =
    connectionMode === "user_account"
      ? accountActive
        ? "Your synced Telegram chats will appear here."
        : "Link your Telegram account to sync your full inbox."
      : "Conversations will appear here once customers message your bot.";

  if (accountSettingsQuery.isLoading || integrationsQuery.isLoading) {
    return (
      <>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <LoadingState label="Loading Telegram…" />
        </div>
        {connectDialog}
      </>
    );
  }

  if (initialLoadDone && !hasTelegramConnection) {
    return (
      <>
        <div className="flex min-h-0 flex-1 items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-[#26A5E4]/10">
              <FaceRobot className="size-8 text-[#26A5E4]" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Connect Telegram</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              Each workspace uses one Telegram connection: either a Business bot or your personal account (Standard or TDLib).
              You can switch later, but only one is active at a time.
            </p>
            {canManageAccount ? (
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  fullWidth
                  onPress={() => router.push(`${ROUTES.settings}?section=telegram`)}
                  className="h-auto min-h-10 flex-col items-start gap-0.5 py-3 text-left"
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <FaceRobot className="size-4 shrink-0" aria-hidden="true" />
                    Connect Business bot
                  </span>
                  <span className="text-xs font-normal opacity-90">Receive customer messages through your Telegram Business bot.</span>
                </Button>
                <Button
                  fullWidth
                  variant="secondary"
                  onPress={() => setConnectDialogOpen(true)}
                  className="h-auto min-h-10 flex-col items-start gap-0.5 border-[#26A5E4] py-3 text-left text-[#1b7fb0]"
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Person className="size-4 shrink-0" aria-hidden="true" />
                    Link personal account
                  </span>
                  <span className="text-xs font-normal opacity-80">Sync your full Telegram inbox via Standard or TDLib. Replaces the bot while linked.</span>
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-foreground/60">Ask the workspace owner to connect Telegram.</p>
            )}
          </div>
        </div>
        {connectDialog}
      </>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-80 shrink-0 flex-col border-r border-black/[0.06] dark:border-white/10">
        <div className="space-y-2 border-b border-black/[0.06] p-3 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-[var(--default)] px-2.5">
              {connectionMode === "user_account" ? (
                <>
                  <Person className="size-3.5 shrink-0 text-[#26A5E4]" aria-hidden="true" />
                  <span className="truncate text-xs font-medium text-foreground">
                    {linkedAccountLabel}
                    {accountActive
                      ? accountProtocol === "tdlib"
                        ? " · TDLib"
                        : ""
                      : " · Session expired"}
                  </span>
                </>
              ) : (
                <>
                  <FaceRobot className="size-3.5 shrink-0 text-[#26A5E4]" aria-hidden="true" />
                  <span className="truncate text-xs font-medium text-foreground">Business bot</span>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {hasLinkedSession && canManageAccount ? (
                <button
                  type="button"
                  aria-label={accountDisconnect.isPending ? "Logging out" : "Log out of Telegram account"}
                  disabled={accountDisconnect.isPending}
                  onClick={() => setDisconnectDialogOpen(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-[var(--default)] text-foreground/70 transition-colors hover:bg-background hover:text-danger disabled:opacity-50 dark:border-white/10"
                >
                  <ArrowRightFromSquare className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
              <TelegramPanelSettingsMenu
                connectionMode={connectionMode}
                hasLinkedSession={hasLinkedSession}
                accountActive={accountActive}
                accountProtocol={accountProtocol}
                accountSession={accountSession}
                canManageAccount={canManageAccount}
                isSyncing={accountSync.isPending}
                isDisconnecting={accountDisconnect.isPending}
                onLinkAccount={() => setConnectDialogOpen(true)}
                onNewChat={() => setStartChatOpen(true)}
                onSync={() => accountSync.mutate()}
                onDisconnect={() => setDisconnectDialogOpen(true)}
              />
            </div>
          </div>

          {connectionMode === "user_account" && !hasLinkedSession && canManageAccount ? (
            <Button size="sm" fullWidth onPress={() => setConnectDialogOpen(true)}>
              <Person className="size-3.5" aria-hidden="true" />
              Reconnect account
            </Button>
          ) : null}

          {connectionMode === "user_account" && !hasLinkedSession && !canManageAccount ? (
            <p className="text-xs text-foreground/50">Ask the workspace owner to link a Telegram account.</p>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
            <Input
              aria-label="Search Telegram chats"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="h-8 min-h-8 pl-8"
              fullWidth
            />
          </div>
        </div>

        {connectionMode === "user_account" && accountActive ? (
          <div className="flex flex-wrap gap-1 border-b border-black/[0.06] px-3 py-2 dark:border-white/10">
            {[
              { key: "all" as const, label: "All" },
              { key: "private" as const, label: "Private" },
              { key: "groups" as const, label: "Groups" },
              { key: "channels" as const, label: "Channels" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setChatScope(tab.key)}
                className={`h-7 rounded-full px-2.5 text-[11px] font-medium ${
                  chatScope === tab.key ? "bg-[#26A5E4]/15 text-[#1b7fb0]" : "text-foreground/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
            {(foldersQuery.data ?? []).map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setChatScope(folder.remote_folder_id)}
                title="Synced from Telegram"
                className={`h-7 rounded-full px-2.5 text-[11px] font-medium ${
                  chatScope === folder.remote_folder_id ? "bg-[#26A5E4]/15 text-[#1b7fb0]" : "text-foreground/60"
                }`}
              >
                {folder.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" onScroll={handleChatListScroll}>
          {chatsQuery.isLoading ? (
            <LoadingState label="Loading chats…" />
          ) : chatsQuery.isError ? (
            <ErrorState error={chatsQuery.error} onRetry={() => chatsQuery.refetch()} />
          ) : filteredChats.length === 0 ? (
            <EmptyState
              title={connectionMode === "user_account" && !hasLinkedSession ? "No linked account" : "No Telegram chats yet"}
              description={emptyDescription}
              action={
                connectionMode === "user_account" && !hasLinkedSession && canManageAccount ? (
                  <Button size="sm" onPress={() => setConnectDialogOpen(true)}>
                    Link Telegram account
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <ul className="flex flex-col gap-0.5">
                {filteredChats.map((chat) => (
                  <ConversationListItem
                    key={chat.id}
                    id={chat.id}
                    name={telegramChatName(chat)}
                    preview={chat.last_message_preview}
                    timestamp={chat.last_message_at}
                    unreadCount={chat.unread_count}
                    avatarUrl={telegramChatAvatarUrl(chat)}
                    active={chat.id === selectedChatId}
                    onSelect={selectChat}
                  />
                ))}
              </ul>
              {chatsQuery.isFetchingNextPage ? (
                <p className="py-2 text-center text-xs text-foreground/45">Loading more chats…</p>
              ) : null}
            </>
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
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{telegramChatName(selectedChat)}</p>
                {lastSeenLabel ? <p className="truncate text-xs text-foreground/50">{lastSeenLabel}</p> : null}
                {syncingHistory ? <p className="text-xs text-foreground/40">Syncing history…</p> : null}
              </div>
              <LinkedLeadChip linkedLeadId={selectedChat.linked_lead_id ?? null} onOpenDialog={() => setLinkDialogOpen(true)} />
            </div>
            {showForumTopics && forumTopics != null && selectedChatId ? (
              <TelegramGroupTopicsBar
                chatId={selectedChatId}
                topics={forumTopics}
                selectedTopicId={selectedForumTopic?.forum_topic_id ?? null}
                onSelect={selectForumTopic}
                onTopicCreated={selectForumTopic}
                onTopicDeleted={handleForumTopicDeleted}
                disabled={syncingHistory || topicsQuery.isFetching}
              />
            ) : null}
            <div className="relative min-h-0 flex-1">
              <div ref={messagesScrollRef} className="h-full overflow-y-auto py-2" onScroll={handleMessagesScroll}>
              {messagesQuery.isLoading ? (
                <LoadingState label="Loading messages…" />
              ) : messagesQuery.isError ? (
                <ErrorState error={messagesQuery.error} onRetry={() => messagesQuery.refetch()} />
              ) : messages.length === 0 ? (
                <EmptyState
                  title="No messages yet"
                  description={isChannelBroadcast ? "Channel posts will appear here." : "Send the first message below."}
                />
              ) : (
                <>
                  {isAccountChat && (historyHasMore || syncingHistory) ? (
                    <div className="flex justify-center px-4 pb-2">
                      <button
                        type="button"
                        onClick={() => void loadOlderHistory()}
                        disabled={syncingHistory || !historyHasMore}
                        className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-background disabled:opacity-50 dark:border-white/10"
                      >
                        {syncingHistory ? "Loading older messages…" : "Load older messages"}
                      </button>
                    </div>
                  ) : null}
                  {messages.map((message) => {
                  const mediaUrl = telegramMessageMediaUrl(message, selectedChat as TelegramChat);
                  const caption = (message.text_content || "").trim();
                  const kind = resolveTelegramMessageKind(message);
                  const thumbFileId = resolveTelegramMessageThumbnailFileId(message);
                  const posterUrl = thumbFileId
                    ? telegramMessageMediaUrl(message, selectedChat as TelegramChat, thumbFileId)
                    : null;
                  const hasMedia =
                    (Boolean(mediaUrl) && isTelegramRenderableMediaKind(kind)) ||
                    (Boolean(posterUrl) &&
                      (kind === "video" || kind === "video_note" || kind === "animation"));
                  const fallback = kind === "text" ? "" : telegramMediaFallbackLabel(kind);
                  const showInboundSender =
                    message.direction === "inbound" &&
                    !isTelegramChannelChat(selectedChat) &&
                    (isTelegramGroupLikeChat(selectedChat, message) || isTelegramPrivateChat(selectedChat));
                  const inboundSender = showInboundSender
                    ? resolveTelegramMessageSender(message, selectedChat)
                    : {};
                  const messageLink = buildTelegramMessageLink(selectedChat, message);
                  return (
                    <MessageBubbleRow
                      key={message.id}
                      content={caption || (hasMedia ? "" : fallback)}
                      mediaUrl={hasMedia ? mediaUrl : null}
                      mediaKind={hasMedia ? kind : null}
                      mediaPosterUrl={hasMedia ? posterUrl : null}
                      senderName={inboundSender.senderName}
                      inboundAvatar={inboundSender.inboundAvatar}
                      avatarChat={showInboundSender ? selectedChat : null}
                      direction={message.direction}
                      timestamp={message.created_at}
                      status={message.status}
                      replyQuote={getReplyQuote(message) ?? null}
                      isEdited={Boolean(message.is_edited)}
                      reaction={message.metadata?.operator_reaction ?? null}
                      selectionMode={selectionMode}
                      selected={selectedIds.has(message.id)}
                      onToggleSelect={() => toggleSelected(message.id)}
                      onPhotoClick={kind === "photo" && mediaUrl ? () => openPhotoLightbox(message.id) : undefined}
                      phoneActions={phoneActions}
                      wrapBubble={(bubble) => (
                        <TelegramMessageMenu
                          message={message}
                          mediaUrl={mediaUrl}
                          onCopy={() => void handleCopy(message)}
                          onCopyLink={messageLink ? () => void handleCopyLink(messageLink) : undefined}
                          onSaveImage={() => void handleSaveImage(message)}
                          onReply={() => handleReply(message)}
                          onForward={() => openForward([message.id])}
                          onReact={(emoji) => handleReact(message, emoji)}
                          onEdit={() => handleEdit(message)}
                          onDelete={() => handleDelete(message)}
                          onStartSelect={() => handleStartSelect(message)}
                        >
                          {bubble}
                        </TelegramMessageMenu>
                      )}
                    />
                  );
                  })}
                </>
              )}
              </div>
              {showGoToBottom && messages.length > 0 ? (
                <button
                  type="button"
                  aria-label="Go to bottom"
                  onClick={() => scrollMessagesToBottom()}
                  className="absolute bottom-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border border-black/10 bg-background text-foreground shadow-md transition-colors hover:bg-[var(--default)] dark:border-white/15"
                >
                  <ChevronDown className="size-5" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {selectionMode ? (
              <div className="flex items-center gap-2 border-t border-black/[0.06] bg-[var(--default)] px-4 py-2 dark:border-white/10">
                <span className="flex-1 text-sm font-medium text-foreground/70">{selectedIds.size} selected</span>
                <button
                  type="button"
                  onClick={() => void handleBulkCopy()}
                  disabled={selectedIds.size === 0}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/10 px-3 text-xs font-medium hover:bg-background disabled:opacity-40 dark:border-white/10"
                >
                  <Copy className="size-3.5" aria-hidden="true" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={handleBulkForward}
                  disabled={selectedIds.size === 0}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/10 px-3 text-xs font-medium hover:bg-background disabled:opacity-40 dark:border-white/10"
                >
                  <Forward className="size-3.5" aria-hidden="true" />
                  Forward
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-danger/30 px-3 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-40"
                >
                  <TrashBin className="size-3.5" aria-hidden="true" />
                  Delete
                </button>
                <button type="button" onClick={clearMessageActions} aria-label="Cancel selection" className="text-foreground/40 hover:text-foreground">
                  <SquareXmark className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {!isChannelBroadcast ? (
              <TextComposer
                key={editingId ?? "new"}
                onSend={handleComposerSend}
                isSending={sendMutation.isPending || editMutation.isPending}
                disabled={Boolean(selectedChat.conversation_closed_at)}
                disabledReason={selectedChat.conversation_closed_at ? "This conversation is marked closed." : undefined}
                initialValue={editingId ? messages.find((m) => m.id === editingId)?.text_content ?? "" : ""}
                submitLabel={editingId ? "Save" : undefined}
                cannedResponses={cannedResponses}
                contextBanner={
                  editingId
                    ? { label: "Editing message", text: messages.find((m) => m.id === editingId)?.text_content || "", onCancel: () => setEditingId(null) }
                    : replyTo
                      ? {
                          label: `Replying to ${replyTo.direction === "outbound" ? "yourself" : customerName}`,
                          text: messageCopyLine(replyTo) || "[message]",
                          onCancel: () => setReplyTo(null),
                        }
                      : null
                }
              />
            ) : null}
            {!isChannelBroadcast && (sendMutation.isError || editMutation.isError || actionError) ? (
              <p role="alert" className="px-4 pb-2 text-xs text-danger">
                {actionError ?? "Failed to send. Try again."}
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

      {forwardMessageIds && selectedChat ? (
        <ForwardMessageDialog
          sourceChatId={selectedChat.id}
          messageCount={forwardMessageIds.length}
          chats={filteredChats}
          isSubmitting={forwardMutation.isPending}
          onForward={handleForwardSubmit}
          onClose={() => setForwardMessageIds(null)}
        />
      ) : null}

      <TelegramDeleteMessagesDialog
        count={pendingDeleteIds.length}
        isOpen={deleteDialogOpen}
        isSubmitting={isDeletingMessages}
        isAccountChat={isAccountChat}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (!isDeletingMessages) {
            setDeleteDialogOpen(false);
            setPendingDeleteIds([]);
          }
        }}
      />

      {connectDialog}

      {startChatOpen && workspaceId ? (
        <TelegramStartChatDialog
          workspaceId={workspaceId}
          onChatOpened={(chatId) => {
            selectChat(chatId);
            void chatsQuery.refetch();
          }}
          onClose={() => setStartChatOpen(false)}
        />
      ) : null}

      <TelegramAccountDisconnectDialog
        accountLabel={linkedAccountLabel}
        conversationCount={rawChats.length}
        isOpen={disconnectDialogOpen}
        isSubmitting={accountDisconnect.isPending}
        onClose={() => setDisconnectDialogOpen(false)}
        onConfirm={async (deleteConversations) => {
          await accountDisconnect.mutateAsync(deleteConversations);
          setDisconnectDialogOpen(false);
          setSelectedChatId(null);
          void accountSettingsQuery.refetch();
          void chatsQuery.refetch();
        }}
      />

      {photoLightboxIndex !== null && chatPhotoItems.length > 0 ? (
        <PhotoLightbox
          items={chatPhotoItems}
          initialIndex={photoLightboxIndex}
          onClose={() => setPhotoLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}
