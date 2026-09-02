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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sticker,
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
import { TelegramChatListMenu } from "@/features/messages/components/TelegramChatListMenu";
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
import { StickerGifPicker } from "@/features/messages/components/StickerGifPicker";
import { LinkedLeadChip } from "@/features/messages/components/LinkedLeadChip";
import { LinkLeadDialog } from "@/features/messages/components/LinkLeadDialog";
import { downloadTelegramMedia, telegramMessagesApi } from "@/services/api/telegramMessages";
import { telegramAccountApi } from "@/services/api/telegramAccount";
import {
  resolveTelegramMessageKind,
  resolveTelegramMessageMediaPresentation,
  resolveStickerFileIds,
  resolveStickerSetName,
  telegramMediaFallbackLabel,
} from "@/features/messages/lib/telegramMedia";
import { DaySeparator, groupMessagesByDay } from "@/features/messages/lib/messageDayGroups";
import { resolveTelegramMessageSender, resolveOutboundOperatorMark, resolveTelegramAccountOutboundMark, pickAvatarColor } from "@/features/messages/lib/telegramSender";
import { buildTelegramMessageLink } from "@/features/messages/lib/telegramMessageLink";
import { isTelegramGroupLikeChat } from "@/features/messages/lib/telegramUserAvatar";
import {
  formatTelegramLastSeen,
  isTelegramChannelChat,
  isTelegramGroupChat,
  isTelegramPrivateChat,
  isTelegramAccountChat,
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
  useTelegramAssignChatMutation,
  useTelegramChatAssigneesQuery,
  useTelegramChatsQuery,
  useTelegramDeleteChatMutation,
  useTelegramDeleteMutation,
  useTelegramEditMutation,
  useTelegramForwardMutation,
  useTelegramLinkLeadMutation,
  useTelegramMarkReadMutation,
  useTelegramMessagesQuery,
  useTelegramReactionMutation,
  useTelegramRealtime,
  useTelegramSendMutation,
  useTelegramSetClosedMutation,
  useTelegramSyncHistoryMutation,
  readTelegramMessagesCache,
  patchTelegramMessagesInCache,
  USER_ACCOUNT_CHAT_PREFETCH_TARGET,
  CHAT_OPEN_HISTORY_SYNC_LIMIT,
} from "@/features/messages/hooks/useTelegramInbox";
import { useSenderProfileMap } from "@/features/messages/hooks/useSenderProfileMap";
import {
  useTelegramAccountFoldersQuery,
  useTelegramAccountSettingsQuery,
  useTelegramAccountSyncMutation,
  useTelegramAccountDisconnectMutation,
  useTelegramStartChatMutation,
  useTelegramAccountAddContactMutation,
} from "@/features/messages/hooks/useTelegramAccount";
import { useTelegramGroupTopicsQuery } from "@/features/messages/hooks/useTelegramGroupTopics";
import { useAgenticSettings, useAgenticStatus, useAgentResume, useAgentTakeover, useAgenticDrafts, useApproveDraft, useRejectDraft, useDiscardDraft, useRegenerateDraft, useApproveAllDrafts, useCopilotUnseen, useMarkCopilotSeen, useSuggestReply, patchTelegramChatInCache, useSetChatExcluded } from "@/features/messages/hooks/useAgentic";
import { AgenticApprovalsQueue } from "@/features/messages/components/agentic/AgenticApprovalsQueue";
import { AgenticDraftCard } from "@/features/messages/components/agentic/AgenticDraftCard";
import { AgentCatchupBar } from "@/features/messages/components/agentic/AgentCatchupBar";
import { AgentCopilotPanel } from "@/features/messages/components/agentic/AgentCopilotPanel";
import { ChatRecapBanner } from "@/features/messages/components/agentic/ChatRecapBanner";
import { AgentThreadBars, ReplyBlockedBanner } from "@/features/messages/components/agentic/AgentThreadBars";
import { TakeoverFollowupBar } from "@/features/messages/components/agentic/TakeoverFollowupBar";
import { AGENT_VIOLET } from "@/features/messages/components/agentic/constants";
import { CreateLeadFromChatDialog } from "@/features/messages/components/CreateLeadFromChatDialog";
import { AutoLeadCreateDialog } from "@/features/messages/components/AutoLeadCreateDialog";
import { StickerPackDialog } from "@/features/messages/components/StickerPackDialog";
import { TelegramContactProfileDialog } from "@/features/messages/components/TelegramContactProfileDialog";
import { InboxFilterPopover } from "@/features/messages/components/InboxFilterPopover";
import { TelegramChatHeaderMenu } from "@/features/messages/components/TelegramChatHeaderMenu";
import { resolveAssignedToParam, resolveChatAssigneeDisplay, type InboxFilter } from "@/features/messages/lib/inboxFilters";
import {
  AgenticModeSettingsDialog,
  type AgenticChatLite,
} from "@/features/messages/components/agentic/AgenticModeSettingsDialog";

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

function guessMessageKindFromFile(file: File): string {
  if (file.type === "image/gif") return "animation";
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

export function TelegramPanel({
  onUnreadChange,
  onChatOpenChange,
}: {
  onUnreadChange?: (count: number) => void;
  onChatOpenChange?: (open: boolean) => void;
}) {
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
  const [linkLeadChatId, setLinkLeadChatId] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [startChatOpen, setStartChatOpen] = useState(false);
  const [agenticSettingsOpen, setAgenticSettingsOpen] = useState(false);
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
  const [phoneBoundNotice, setPhoneBoundNotice] = useState<string | null>(null);
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState<number | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [selectedForumTopic, setSelectedForumTopic] = useState<TelegramForumTopic | null>(null);
  const [showGoToBottom, setShowGoToBottom] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [mediaSending, setMediaSending] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [takeoverFollowupFor, setTakeoverFollowupFor] = useState<string | null>(null);
  const [composerSeed, setComposerSeed] = useState(0);
  const [composerInitial, setComposerInitial] = useState("");
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [operatorFilterId, setOperatorFilterId] = useState<string | null>(null);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [autoLeadOpen, setAutoLeadOpen] = useState(false);
  const [stickerPackSetName, setStickerPackSetName] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const assignedFilter = useMemo(
    () => resolveAssignedToParam(inboxFilter, operatorFilterId, currentUserId),
    [inboxFilter, operatorFilterId, currentUserId],
  );

  const chatsQuery = useTelegramChatsQuery(workspaceId, debouncedSearch, connectionMode, assignedFilter);
  const rawChats = useMemo(() => {
    const list = chatsQuery.chats;
    if (connectionMode !== "user_account" || !accountSession?.id) return list;
    return list.filter((chat) => chat.user_session_id === accountSession.id);
  }, [chatsQuery.chats, connectionMode, accountSession?.id]);

  const { data: agenticSettings } = useAgenticSettings(true);
  const agenticEnabled = !!agenticSettings?.enabled;
  const { data: agenticStatus } = useAgenticStatus(agenticEnabled);
  const replyBlocked = agenticEnabled && !!agenticStatus?.replyBlocked;

  const { data: pendingDrafts = [] } = useAgenticDrafts({ status: "pending" }, agenticEnabled);
  const { data: selectedChatDrafts = [] } = useAgenticDrafts(
    { chat_id: selectedChatId ?? undefined, status: "pending" },
    agenticEnabled && !!selectedChatId,
  );
  const selectedDraft = selectedChatDrafts[0] ?? null;
  const approveDraftM = useApproveDraft();
  const rejectDraftM = useRejectDraft();
  const discardDraftM = useDiscardDraft();
  const regenerateDraftM = useRegenerateDraft();
  const approveAllM = useApproveAllDrafts();
  const suggestReplyM = useSuggestReply();
  const markCopilotSeenM = useMarkCopilotSeen(selectedChatId ?? "", "telegram");
  const copilotUnseenQ = useCopilotUnseen(selectedChatId, agenticEnabled && !!selectedChatId);
  const showAgentMode =
    connectionMode === "business_bot" || (connectionMode === "user_account" && accountActive);

  const activeBotUsername = useMemo(() => {
    const bots = integrationsQuery.data ?? [];
    const active = bots.find((b) => b.is_active && b.bot_username);
    return active?.bot_username ?? null;
  }, [integrationsQuery.data]);

  const agenticChatList = useMemo<AgenticChatLite[]>(
    () =>
      rawChats.map((c) => ({
        id: c.id,
        name: telegramChatName(c),
        preview: c.last_message_preview || "",
        avatarColor: pickAvatarColor(c.id),
      })),
    [rawChats],
  );

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
    else     if (typeof chatScope === "number") {
      list = list.filter((c) => Array.isArray(c.folder_ids) && c.folder_ids.includes(chatScope));
    }
    if (inboxFilter === "unread") list = list.filter((c) => (c.unread_count ?? 0) > 0);
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
  }, [rawChats, chatScope, agenticEnabled, inboxFilter]);

  const selectedChat = filteredChats.find((c) => c.id === selectedChatId) ?? rawChats.find((c) => c.id === selectedChatId) ?? null;

  const showForumTopics =
    connectionMode === "user_account" &&
    accountActive &&
    accountProtocol === "tdlib" &&
    Boolean(selectedChat && isTelegramGroupChat(selectedChat));
  const topicsQuery = useTelegramGroupTopicsQuery(selectedChatId, showForumTopics);
  const forumTopics = topicsQuery.data;

  const messagesQuery = useTelegramMessagesQuery(selectedChatId);
  const messagesCache = useMemo(() => readTelegramMessagesCache(messagesQuery.data), [messagesQuery.data]);
  const allMessages = messagesCache.messages;
  const messagesHasMore = messagesCache.hasMore;
  const messages = useMemo(
    () => (showForumTopics && selectedForumTopic ? filterTelegramMessagesByTopic(allMessages, selectedForumTopic) : allMessages),
    [allMessages, selectedForumTopic, showForumTopics],
  );
  const messageDayGroups = useMemo(
    () => groupMessagesByDay(messages, (m) => m.created_at),
    [messages],
  );
  const outboundSenderIds = useMemo(
    () =>
      messages
        .filter((m) => m.direction === "outbound" && m.sender_id && m.metadata?.ai_generated !== true)
        .map((m) => m.sender_id as string),
    [messages],
  );
  const senderProfiles = useSenderProfileMap(outboundSenderIds, workspaceId ?? undefined);

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
  const assigneesQuery = useTelegramChatAssigneesQuery(workspaceId);
  const assignChatMutation = useTelegramAssignChatMutation(workspaceId);
  const deleteChatMutation = useTelegramDeleteChatMutation(workspaceId);
  const setClosedMutation = useTelegramSetClosedMutation(workspaceId);
  const excludeChatMutation = useSetChatExcluded("telegram");

  const assigneeLabelByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of assigneesQuery.data ?? []) map[a.user_id] = a.label;
    return map;
  }, [assigneesQuery.data]);

  const draftsByChatId = useMemo(() => new Set(pendingDrafts.map((d) => d.chat_id)), [pendingDrafts]);

  const inboxUnreadTotal = useMemo(
    () => rawChats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0),
    [rawChats],
  );
  const mineChatCount = useMemo(
    () => assigneesQuery.data?.find((a: { user_id: string; chat_count?: number }) => a.user_id === currentUserId)?.chat_count ?? 0,
    [assigneesQuery.data, currentUserId],
  );

  const takeOverMutation = useAgentTakeover();
  const resumeMutation = useAgentResume();

  const linkLeadTargetChat = useMemo(() => {
    const id = linkLeadChatId ?? selectedChatId;
    if (!id) return null;
    return rawChats.find((c) => c.id === id) ?? null;
  }, [linkLeadChatId, selectedChatId, rawChats]);

  const isAgentTargeted = useCallback(
    (chat: TelegramChat): boolean => {
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
    (chat: TelegramChat): string | null => {
      if (chat.agentic_paused) return "Human";
      if (draftsByChatId.has(chat.id)) return "Draft";
      return isAgentTargeted(chat) ? "Agent" : null;
    },
    [draftsByChatId, isAgentTargeted],
  );

  const exportChat = useCallback(async (chatId: string) => {
    try {
      const list = await telegramMessagesApi.listAll(chatId);
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const lines = [
        "timestamp,direction,text",
        ...list.map((m) =>
          [m.created_at, m.direction, escape((m.text_content || "").replace(/\r?\n/g, " "))].join(","),
        ),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `telegram-chat-${chatId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError("Failed to export chat.");
    }
  }, []);

  const handleAssignChat = useCallback(
    (chatId: string, assignedTo: string | null) => {
      assignChatMutation.mutate(
        { chatId, assignedTo },
        { onError: () => setActionError("Failed to assign chat.") },
      );
    },
    [assignChatMutation],
  );

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      if (!window.confirm("Delete this chat and all its messages?")) return;
      deleteChatMutation.mutate(chatId, {
        onSuccess: () => {
          if (selectedChatId === chatId) {
            setSelectedChatId(null);
            clearMessageActions();
          }
        },
        onError: () => setActionError("Failed to delete chat."),
      });
    },
    [deleteChatMutation, selectedChatId],
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

  const chatInfoForAgentic = useCallback(
    (chatId: string) => {
      const c = rawChats.find((x) => x.id === chatId);
      return {
        name: c ? telegramChatName(c) : "Customer",
        avatarColor: pickAvatarColor(chatId),
      };
    },
    [rawChats],
  );

  const draftBusy =
    approveDraftM.isPending || regenerateDraftM.isPending || discardDraftM.isPending || approveAllM.isPending;

  useEffect(() => {
    if (!copilotOpen || !selectedChatId) return;
    markCopilotSeenM.mutate();
    patchTelegramChatInCache(queryClient, selectedChatId, { needs_attention: false, unseen_escalations: 0 });
  }, [copilotOpen, selectedChatId, markCopilotSeenM, queryClient]);

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

  useTelegramRealtime(workspaceId, selectedChatId, {
    openChatLinkedLeadId: selectedChat?.linked_lead_id ?? null,
    onChatDeleted: (chatId) => {
      if (selectedChatId === chatId) setSelectedChatId(null);
    },
    onLeadPhoneBound: ({ phoneNumber }) => {
      setPhoneBoundNotice(
        phoneNumber ? `Phone number saved: ${phoneNumber} was added to this lead.` : "Phone number saved to this lead.",
      );
    },
  });

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
    setPhoneBoundNotice(null);
    setLastSeenLabel(null);
    setSyncingHistory(false);
    setHistoryHasMore(false);
    setSelectedForumTopic(null);
    setStickerPickerOpen(false);
    setComposerInitial("");
    setApprovalsOpen(false);

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
        .then((data: { has_more?: boolean } | undefined) => setHistoryHasMore(Boolean(data?.has_more)))
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
        .then((data: { has_more?: boolean } | undefined) => setHistoryHasMore(Boolean(data?.has_more)))
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
      .then((data: { has_more?: boolean } | undefined) => setHistoryHasMore(Boolean(data?.has_more)))
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
  const canLoadOlder = isAccountChat ? historyHasMore : messagesHasMore;

  useEffect(() => {
    onChatOpenChange?.(Boolean(selectedChatId));
  }, [selectedChatId, onChatOpenChange]);

  const loadOlderHistory = useCallback(async () => {
    if (!selectedChat || syncingHistory || loadingOlderRef.current) return;

    const scrollEl = messagesScrollRef.current;
    const prevHeight = scrollEl?.scrollHeight ?? 0;

    if (!isAccountChat) {
      if (!messagesHasMore || messages.length === 0) return;
      const oldest = messages[0]?.created_at;
      if (!oldest) return;

      loadingOlderRef.current = true;
      setSyncingHistory(true);
      try {
        const page = await telegramMessagesApi.listPage(selectedChat.id, { limit: 100, before: oldest });
        if (!page.messages.length) {
          patchTelegramMessagesInCache(queryClient, selectedChat.id, (prev) => ({ ...prev, hasMore: false }));
          return;
        }
        patchTelegramMessagesInCache(queryClient, selectedChat.id, (prev) => {
          const seen = new Set(prev.messages.map((m) => m.id));
          const older = page.messages.filter((m) => !seen.has(m.id));
          return {
            hasMore: page.hasMore,
            messages: older.length ? [...older, ...prev.messages] : prev.messages,
          };
        });
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
      return;
    }

    if (!historyHasMore) return;

    const oldestTelegramId = messages.reduce<number | null>((min, m) => {
      const id = m.telegram_message_id;
      if (id == null || !Number.isFinite(Number(id))) return min;
      const num = Number(id);
      return min == null || num < min ? num : min;
    }, null);

    loadingOlderRef.current = true;
    setSyncingHistory(true);
    try {
      const data = await syncHistoryMutation.mutateAsync({
        chatId: selectedChat.id,
        limit: CHAT_OPEN_HISTORY_SYNC_LIMIT,
        offsetId: oldestTelegramId ?? undefined,
        forumTopicId: selectedForumTopic?.forum_topic_id,
      });
      setHistoryHasMore(Boolean((data as { has_more?: boolean } | undefined)?.has_more));
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
  }, [historyHasMore, isAccountChat, messages, messagesHasMore, queryClient, selectedChat, selectedForumTopic, syncHistoryMutation, syncingHistory]);

  const handleMessagesScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      setShowGoToBottom(!isMessagesNearBottom(el));

      if (!canLoadOlder || syncingHistory || loadingOlderRef.current) return;
      if (el.scrollTop <= MESSAGES_SCROLL_TOP_THRESHOLD_PX) {
        void loadOlderHistory();
      }
    },
    [canLoadOlder, loadOlderHistory, syncingHistory],
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

  async function handleSendMedia(file: File) {
    if (!selectedChat || mediaSending || sendMutation.isPending || editingId) return;

    const tempId = `optimistic-${crypto.randomUUID()}`;
    const previewUrl = URL.createObjectURL(file);
    const messageKind = guessMessageKindFromFile(file);
    const optimistic: TelegramMessage = {
      id: tempId,
      chat_id: selectedChat.id,
      direction: "outbound",
      text_content: "",
      message_kind: messageKind,
      status: "pending",
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      preview_url: previewUrl,
    };

    queryClient.setQueryData(["telegram-messages", selectedChat.id], (prev) => {
      const cache = readTelegramMessagesCache(prev as Parameters<typeof readTelegramMessagesCache>[0]);
      return { ...cache, messages: [...cache.messages, optimistic] };
    });
    setMediaSending(true);
    setActionError(null);

    try {
      const saved = await telegramMessagesApi.sendMedia({
        chatId: selectedChat.id,
        file,
        senderId: currentUserId,
        replyToMessageId: replyTo?.telegram_message_id ?? null,
        forumTopicId: selectedForumTopic?.forum_topic_id,
      });
      URL.revokeObjectURL(previewUrl);
      queryClient.setQueryData(["telegram-messages", selectedChat.id], (prev) => {
        const cache = readTelegramMessagesCache(prev as Parameters<typeof readTelegramMessagesCache>[0]);
        return {
          ...cache,
          messages: cache.messages.map((m) =>
            m.id === tempId ? (saved ?? { ...m, status: "sent", preview_url: undefined }) : m,
          ),
        };
      });
      setReplyTo(null);
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      queryClient.setQueryData(["telegram-messages", selectedChat.id], (prev) => {
        const cache = readTelegramMessagesCache(prev as Parameters<typeof readTelegramMessagesCache>[0]);
        return {
          ...cache,
          messages: cache.messages.map((m) =>
            m.id === tempId ? { ...m, status: "failed", preview_url: undefined } : m,
          ),
        };
      });
      setActionError(err instanceof Error ? err.message : "Failed to send media. Try again.");
    } finally {
      setMediaSending(false);
    }
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
    const kind = resolveTelegramMessageKind(m);
    const stickerResolved = kind === "sticker" ? resolveStickerFileIds(m) : null;
    const mediaUrl = stickerResolved?.fileId
      ? telegramMessageMediaUrl(m, selectedChat, stickerResolved.fileId)
      : telegramMessageMediaUrl(m, selectedChat);
    if (!mediaUrl) return;
    const base = m.telegram_message_id != null ? String(m.telegram_message_id) : m.id.replace(/[^a-z0-9-]/gi, "").slice(0, 12);
    const ext = kind === "sticker" ? "webp" : "jpg";
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
      <div
        className={`${selectedChatId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-black/[0.06] dark:border-white/10 md:w-80`}
      >
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
                onAutoLeadCreate={() => setAutoLeadOpen(true)}
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

          {/* Agent Mode — Business bot and linked user account (Pyrogram / TDLib). */}
          {showAgentMode ? (
            <button
              type="button"
              onClick={() => setAgenticSettingsOpen(true)}
              className="flex h-9 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors"
              style={
                agenticEnabled
                  ? { backgroundColor: "#7C3AED", color: "#fff" }
                  : { backgroundColor: "#7C3AED14", color: "#7C3AED" }
              }
              title="Agentic Mode"
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
          ) : null}

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
            <InboxFilterPopover
              value={inboxFilter}
              onChange={setInboxFilter}
              unreadCount={inboxUnreadTotal}
              mineCount={mineChatCount}
              operatorId={operatorFilterId}
              onOperatorChange={setOperatorFilterId}
              operators={assigneesQuery.data ?? []}
              operatorsLoading={assigneesQuery.isLoading}
            />
          </div>
        ) : (
          <div className="flex justify-end border-b border-black/[0.06] px-3 py-2 dark:border-white/10">
            <InboxFilterPopover
              value={inboxFilter}
              onChange={setInboxFilter}
              unreadCount={inboxUnreadTotal}
              mineCount={mineChatCount}
              operatorId={operatorFilterId}
              onOperatorChange={setOperatorFilterId}
              operators={assigneesQuery.data ?? []}
              operatorsLoading={assigneesQuery.isLoading}
            />
          </div>
        )}

        {agenticEnabled ? <AgentCatchupBar onOpenChat={selectChat} /> : null}
        {replyBlocked ? <ReplyBlockedBanner botUsername={agenticStatus?.botUsername} /> : null}

        <div className="min-h-0 flex-1 overflow-y-auto pb-2" onScroll={handleChatListScroll}>
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
              <ul className="flex flex-col">
                {filteredChats.map((chat) => {
                  const assigneeDisplay = resolveChatAssigneeDisplay({
                    assignedTo: chat.assigned_to,
                    currentUserId,
                    labelByUserId: assigneeLabelByUserId,
                  });
                  const badge = agentBadgeFor(chat);
                  return (
                  <TelegramChatListMenu
                    key={chat.id}
                    chat={chat}
                    id={chat.id}
                    name={telegramChatName(chat)}
                    preview={chat.last_message_preview}
                    timestamp={chat.last_message_at}
                    unreadCount={chat.unread_count}
                    avatarUrl={telegramChatAvatarUrl(chat)}
                    active={chat.id === selectedChatId}
                    onSelect={selectChat}
                    attention={!!chat.needs_attention}
                    agentBadge={badge}
                    agentBadgeIsHuman={!!chat.agentic_paused}
                    assignee={assigneeDisplay.assignee}
                    unassigned={assigneeDisplay.unassigned}
                    closed={!!chat.conversation_closed_at}
                    currentUserId={currentUserId}
                    assignees={assigneesQuery.data ?? []}
                    assigneesLoading={assigneesQuery.isLoading || assigneesQuery.isFetching}
                    agenticEnabled={agenticEnabled}
                    showTakeOver={isAgentTargeted(chat) && !chat.agentic_paused}
                    showResume={!!chat.agentic_paused}
                    onAssignToMe={() => handleAssignChat(chat.id, currentUserId ?? null)}
                    onUnassign={() => handleAssignChat(chat.id, null)}
                    onAssignTo={(userId) => handleAssignChat(chat.id, userId)}
                    onLinkLead={() => {
                      setLinkLeadChatId(chat.id);
                      setLinkDialogOpen(true);
                    }}
                    onExport={() => void exportChat(chat.id)}
                    onTakeOver={() => handleAgentTakeOver(chat.id)}
                    onResume={() => handleAgentResume(chat.id)}
                    onDelete={() => handleDeleteChat(chat.id)}
                    onOpenChange={(open) => {
                      if (open) void assigneesQuery.refetch();
                    }}
                  />
                  );
                })}
              </ul>
              {chatsQuery.isFetchingNextPage ? (
                <p className="py-2 text-center text-xs text-foreground/45">Loading more chats…</p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className={`${!selectedChatId ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-1`}>
        {!selectedChat ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="Select a conversation" description="Choose a Telegram chat from the list to view messages." />
          </div>
        ) : approvalsOpen ? (
          <AgenticApprovalsQueue
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
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="min-w-0 text-left transition-opacity hover:opacity-80"
                >
                  <p className="truncate text-sm font-semibold text-foreground">{telegramChatName(selectedChat)}</p>
                  {lastSeenLabel ? <p className="truncate text-xs text-foreground/50">{lastSeenLabel}</p> : null}
                  {syncingHistory ? <p className="text-xs text-foreground/40">Syncing history…</p> : null}
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <TelegramChatHeaderMenu
                  linkedLeadId={selectedChat.linked_lead_id ?? null}
                  excludedFromAgent={
                    Array.isArray(agenticSettings?.blocked_chat_ids) &&
                    agenticSettings.blocked_chat_ids.includes(selectedChat.id)
                  }
                  closed={!!selectedChat.conversation_closed_at}
                  agenticEnabled={agenticEnabled}
                  busy={excludeChatMutation.isPending || setClosedMutation.isPending}
                  onLinkLead={() => {
                    setLinkLeadChatId(null);
                    setLinkDialogOpen(true);
                  }}
                  onCreateLead={() => setCreateLeadOpen(true)}
                  onUnlinkLead={
                    selectedChat.linked_lead_id
                      ? () =>
                          void linkLeadMutation.mutateAsync({ chatId: selectedChat.id, leadId: null })
                      : undefined
                  }
                  onSetExcluded={(excluded) =>
                    excludeChatMutation.mutate(
                      { chatId: selectedChat.id, excluded },
                      { onError: () => setActionError("Failed to update AI exclusion.") },
                    )
                  }
                  onSetClosed={(closed) =>
                    setClosedMutation.mutate(
                      { chatId: selectedChat.id, closed },
                      { onError: () => setActionError("Failed to update conversation status.") },
                    )
                  }
                />
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
                <LinkedLeadChip
                  linkedLeadId={selectedChat.linked_lead_id ?? null}
                  onOpenDialog={() => {
                    setLinkLeadChatId(null);
                    setLinkDialogOpen(true);
                  }}
                />
              </div>
            </div>
            {replyBlocked ? <ReplyBlockedBanner botUsername={agenticStatus?.botUsername} /> : null}
            {phoneBoundNotice ? (
              <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-800 dark:text-emerald-200">
                <span>{phoneBoundNotice}</span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setPhoneBoundNotice(null)}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-emerald-700/70 hover:bg-emerald-500/10"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
            {agenticEnabled ? <ChatRecapBanner key={selectedChat.id} chatId={selectedChat.id} /> : null}
            {takeoverFollowupFor === selectedChat.id ? (
              <TakeoverFollowupBar
                chatId={selectedChat.id}
                busy={sendMutation.isPending}
                onSend={(text) => {
                  void handleComposerSend(text);
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
                  {(canLoadOlder || syncingHistory) ? (
                    <div className="flex justify-center px-4 pb-2">
                      <button
                        type="button"
                        onClick={() => void loadOlderHistory()}
                        disabled={syncingHistory || !canLoadOlder}
                        className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-background disabled:opacity-50 dark:border-white/10"
                      >
                        {syncingHistory ? "Loading older messages…" : "Load older messages"}
                      </button>
                    </div>
                  ) : null}
                  {messageDayGroups.map((group) => (
                    <div key={group.label}>
                      <DaySeparator label={group.label} />
                      {group.items.map((message) => {
                  const presentation = resolveTelegramMessageMediaPresentation(
                    message,
                    selectedChat as TelegramChat,
                  );
                  const caption = (message.text_content || "").trim();
                  const { kind, mediaUrl, posterUrl, stickerPreferVideo, documentLabel, contactInfo, hasRenderableMedia } =
                    presentation;
                  const hasMedia = hasRenderableMedia || kind === "video_note";
                  const fallback = kind === "text" ? "" : telegramMediaFallbackLabel(kind);
                  const bubbleContent =
                    caption || (hasRenderableMedia ? "" : fallback) || (kind === "video_note" ? "Video message" : "");
                  const showInboundSender =
                    message.direction === "inbound" &&
                    !isTelegramChannelChat(selectedChat) &&
                    (isTelegramGroupLikeChat(selectedChat, message) || isTelegramPrivateChat(selectedChat));
                  const inboundSender = showInboundSender
                    ? resolveTelegramMessageSender(message, selectedChat)
                    : {};
                  const isAgentMsg = message.direction === "outbound" && message.metadata?.ai_generated === true;
                  const useAccountOperatorMark =
                    connectionMode === "user_account" &&
                    Boolean(selectedChat && isTelegramAccountChat(selectedChat));
                  const operatorMark =
                    message.direction === "outbound" && !isAgentMsg
                      ? useAccountOperatorMark
                        ? resolveTelegramAccountOutboundMark(message, senderProfiles, accountSession)
                        : resolveOutboundOperatorMark(message.sender_id ?? undefined, senderProfiles)
                      : {};
                  const stickerSetName = kind === "sticker" ? resolveStickerSetName(message) : null;
                  const messageLink = buildTelegramMessageLink(selectedChat, message);
                  return (
                    <MessageBubbleRow
                      key={message.id}
                      content={bubbleContent}
                      mediaUrl={hasRenderableMedia ? mediaUrl : null}
                      mediaKind={hasMedia ? kind : null}
                      mediaPosterUrl={hasRenderableMedia ? posterUrl : null}
                      mediaStickerPreferVideo={stickerPreferVideo}
                      mediaDocumentLabel={documentLabel}
                      mediaContactInfo={contactInfo}
                      senderName={isAgentMsg ? undefined : inboundSender.senderName ?? operatorMark.senderName}
                      inboundAvatar={inboundSender.inboundAvatar}
                      outboundAvatar={operatorMark.outboundAvatar}
                      avatarChat={showInboundSender ? selectedChat : null}
                      onStickerClick={stickerSetName ? () => setStickerPackSetName(stickerSetName) : undefined}
                      direction={message.direction}
                      timestamp={message.created_at}
                      status={message.status}
                      replyQuote={getReplyQuote(message) ?? null}
                      isEdited={Boolean(message.is_edited)}
                      reaction={message.metadata?.operator_reaction ?? null}
                      agentGenerated={isAgentMsg}
                      agentVoiceDurationSec={message.metadata?.voice_duration_sec ?? null}
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
                    </div>
                  ))}
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

            {!selectionMode ? (
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
            ) : null}

            {!selectionMode && !isChannelBroadcast && selectedDraft && agenticEnabled ? (
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

            {!isChannelBroadcast ? (
              <TextComposer
                key={`${editingId ?? "new"}-${composerSeed}`}
                onSend={handleComposerSend}
                isSending={sendMutation.isPending || editMutation.isPending || mediaSending}
                disabled={Boolean(selectedChat.conversation_closed_at)}
                disabledReason={selectedChat.conversation_closed_at ? "This conversation is marked closed." : undefined}
                onFileSelect={editingId || isChannelBroadcast ? undefined : handleSendMedia}
                onVoiceRecord={editingId || isChannelBroadcast ? undefined : handleSendMedia}
                initialValue={
                  editingId ? messages.find((m) => m.id === editingId)?.text_content ?? "" : composerInitial
                }
                submitLabel={editingId ? "Save" : undefined}
                cannedResponses={cannedResponses}
                toolbarStart={
                  stickerPickerOpen && selectedChat && !editingId ? (
                    <div className="absolute bottom-full left-0 z-30 mb-2">
                      <StickerGifPicker
                        key={selectedChat.id}
                        chat={selectedChat}
                        accountMode={connectionMode === "user_account"}
                        senderId={currentUserId}
                        onClose={() => setStickerPickerOpen(false)}
                        onUploadGif={(file) => void handleSendMedia(file)}
                      />
                    </div>
                  ) : null
                }
                leadingActions={
                  !editingId ? (
                    <>
                      {agenticEnabled && isAgentTargeted(selectedChat) ? (
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
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setStickerPickerOpen((open) => !open)}
                        disabled={Boolean(selectedChat.conversation_closed_at) || mediaSending}
                        aria-label="Stickers and GIFs"
                        aria-pressed={stickerPickerOpen}
                        className={`mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                          stickerPickerOpen
                            ? "bg-[#26A5E4]/15 text-[#26A5E4]"
                            : "text-foreground/45 hover:bg-[var(--default)] hover:text-foreground"
                        }`}
                      >
                        <Sticker className="size-[18px]" />
                      </button>
                    </>
                  ) : null
                }
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
            </div>
            {copilotOpen && agenticEnabled && selectedChat ? (
              <AgentCopilotPanel
                chatId={selectedChat.id}
                chatName={telegramChatName(selectedChat)}
                workspaceId={workspaceId}
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

      {createLeadOpen && workspaceId && selectedChat ? (
        <CreateLeadFromChatDialog
          isOpen={createLeadOpen}
          workspaceId={workspaceId}
          chatName={telegramChatName(selectedChat)}
          chatUsername={selectedChat.username}
          onClose={() => setCreateLeadOpen(false)}
          onLeadCreated={(leadId) => linkLeadMutation.mutateAsync({ chatId: selectedChat.id, leadId })}
        />
      ) : null}

      {autoLeadOpen && workspaceId ? (
        <AutoLeadCreateDialog
          isOpen={autoLeadOpen}
          workspaceId={workspaceId}
          channel="telegram"
          channelLabel="Telegram"
          onClose={() => setAutoLeadOpen(false)}
        />
      ) : null}

      {stickerPackSetName && selectedChat ? (
        <StickerPackDialog
          isOpen={Boolean(stickerPackSetName)}
          setName={stickerPackSetName}
          chat={selectedChat}
          onClose={() => setStickerPackSetName(null)}
        />
      ) : null}

      {selectedChat ? (
        <TelegramContactProfileDialog
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          chat={selectedChat}
          messages={allMessages}
          onOpenDm={
            connectionMode === "user_account" && accountActive
              ? (userId) => {
                  void startChatByPhone
                    .mutateAsync({ kind: "user", user_id: userId })
                    .then((result) => {
                      const chatId = result.chat?.id;
                      if (chatId) {
                        selectChat(chatId);
                        setProfileOpen(false);
                      }
                    })
                    .catch(() => setActionError("Couldn't open direct message."));
                }
              : undefined
          }
        />
      ) : null}

      {linkDialogOpen && linkLeadTargetChat ? (
        <LinkLeadDialog
          currentLeadId={linkLeadTargetChat.linked_lead_id ?? null}
          isLinking={linkLeadMutation.isPending}
          isUnlinking={linkLeadMutation.isPending}
          onLink={(leadId) => linkLeadMutation.mutateAsync({ chatId: linkLeadTargetChat.id, leadId })}
          onUnlink={() => linkLeadMutation.mutateAsync({ chatId: linkLeadTargetChat.id, leadId: null })}
          onClose={() => {
            setLinkDialogOpen(false);
            setLinkLeadChatId(null);
          }}
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

      {showAgentMode ? (
        <AgenticModeSettingsDialog
          isOpen={agenticSettingsOpen}
          onClose={() => setAgenticSettingsOpen(false)}
          botLabel={
            connectionMode === "user_account"
              ? linkedAccountLabel
              : activeBotUsername
                ? `@${activeBotUsername}`
                : undefined
          }
          accountMode={connectionMode === "user_account"}
          chats={agenticChatList}
          isOwner={canManageAccount}
          onOpenChat={(chatId) => {
            setAgenticSettingsOpen(false);
            selectChat(chatId);
          }}
        />
      ) : null}
    </div>
  );
}
