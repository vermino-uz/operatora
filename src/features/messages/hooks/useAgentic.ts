"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import * as api from "@/services/api/agentic";
import type { AgenticChannel, AgenticSettings, KnowledgeSource } from "@/services/api/agentic";
import { patchInstagramChatInCache } from "@/features/messages/lib/instagramChatRealtime";

const settingsKey = (channel: AgenticChannel) => ["agentic-settings", channel] as const;
const draftsRoot = (channel: AgenticChannel) => ["agentic-drafts", channel] as const;
const draftsKey = (channel: AgenticChannel, params?: { chat_id?: string; status?: string }) =>
  ["agentic-drafts", channel, params || {}] as const;
const statusKey = (channel: AgenticChannel) => ["agentic-status", channel] as const;
const awayRepliesKey = (channel: AgenticChannel) => ["agentic-away-replies", channel] as const;
const knowledgeKey = (channel: AgenticChannel) => ["agentic-knowledge", channel] as const;
const profileKey = ["agentic-profile"] as const;
const blacklistKey = (channel: AgenticChannel) => ["agentic-blacklist", channel] as const;

export function useAgenticSettings(enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: settingsKey(channel),
    queryFn: () => api.getAgenticSettings(channel),
    enabled,
    staleTime: 30_000,
  });
}

export function useAgentProfile(enabled = true) {
  return useQuery({
    queryKey: profileKey,
    queryFn: () => api.getAgentProfile(),
    enabled,
    staleTime: 30_000,
  });
}

export function useSaveAgentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.WorkspaceAgentProfileInput) => api.saveAgentProfile(input),
    onSuccess: (data) => {
      qc.setQueryData(profileKey, data);
      qc.invalidateQueries({ queryKey: profileKey });
      qc.invalidateQueries({ queryKey: ["agentic-settings"] });
    },
  });
}

export function useAwayReplies(enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: awayRepliesKey(channel),
    queryFn: () => api.getAwayReplies(channel),
    enabled,
    staleTime: 30_000,
  });
}

export function useAgenticStatus(enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: statusKey(channel),
    queryFn: () => api.getAgenticStatus(channel),
    enabled,
    staleTime: 15_000,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function useSaveAgenticSettings(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.AgenticSettingsInput) => api.saveAgenticSettings(input, channel),
    onSuccess: (data) => {
      qc.setQueryData(settingsKey(channel), data);
      qc.invalidateQueries({ queryKey: settingsKey(channel) });
      qc.invalidateQueries({ queryKey: draftsRoot(channel) });
    },
  });
}

export function useAgenticDrafts(
  params?: { chat_id?: string; status?: string },
  enabled = true,
  channel: AgenticChannel = "telegram",
) {
  return useQuery({
    queryKey: draftsKey(channel, params),
    queryFn: () => api.getAgenticDrafts(params, channel),
    enabled,
    staleTime: 5_000,
    refetchInterval: enabled && params?.status === "pending" ? 15_000 : false,
  });
}

export function useApproveDraft(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; text?: string; is_voice?: boolean }) =>
      api.approveDraft(vars.id, { text: vars.text, is_voice: vars.is_voice }, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftsRoot(channel) }),
  });
}

export function useRejectDraft(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.rejectDraft(id, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftsRoot(channel) }),
  });
}

export function useDiscardDraft(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.discardDraft(id, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftsRoot(channel) }),
  });
}

export function useRegenerateDraft(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.regenerateDraft(id, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftsRoot(channel) }),
  });
}

export function useApproveAllDrafts(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.approveAllDrafts(channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: draftsRoot(channel) }),
  });
}

export function invalidateAgenticDrafts(qc: QueryClient, channel: AgenticChannel = "telegram") {
  void qc.invalidateQueries({ queryKey: draftsRoot(channel) });
}

const copilotKey = (channel: AgenticChannel, chatId: string) => ["agentic-copilot", channel, chatId] as const;
const recapKey = (channel: AgenticChannel, chatId: string) => ["agentic-recap", channel, chatId] as const;
const catchupKey = (channel: AgenticChannel) => ["agentic-catchup", channel] as const;

export function useCopilotMessages(chatId: string | null, enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: copilotKey(channel, chatId || ""),
    queryFn: () => api.getCopilotMessages(chatId as string, channel),
    enabled: enabled && !!chatId,
    staleTime: 10_000,
  });
}

export function useSendCopilotCommand(chatId: string, channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (command: string) => api.sendCopilotCommand(chatId, command, channel),
    onSuccess: (data) => {
      qc.setQueryData<api.CopilotMessage[]>(copilotKey(channel, chatId), (prev) =>
        [...(prev || []), data.operator, data.assistant].filter(Boolean),
      );
      qc.invalidateQueries({ queryKey: ["agentic-lead-actions", channel, chatId] });
    },
  });
}

export function useCopilotUnseen(chatId: string | null, enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: ["agentic-copilot-unseen", channel, chatId || ""],
    queryFn: () => api.getCopilotUnseen(chatId as string, channel),
    enabled: enabled && !!chatId,
    staleTime: 10_000,
    refetchInterval: enabled && chatId ? 25_000 : false,
  });
}

export function useMarkCopilotSeen(chatId: string, channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markCopilotSeen(chatId, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agentic-copilot-unseen", channel, chatId] }),
  });
}

export function useCopilotSuggestions(chatId: string | null, enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: ["agentic-copilot-suggestions", channel, chatId || ""],
    queryFn: () => api.getCopilotSuggestions(chatId as string, channel),
    enabled: enabled && !!chatId,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useChatRecap(chatId: string | null, enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: recapKey(channel, chatId || ""),
    queryFn: () => api.getChatRecap(chatId as string, channel),
    enabled: enabled && !!chatId,
    staleTime: 25_000,
    retry: 1,
  });
}

export function useRefreshChatRecap(chatId: string, channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.getChatRecap(chatId, channel, { refresh: true }),
    onSuccess: (data) => qc.setQueryData(recapKey(channel, chatId), data),
  });
}

export function useCatchup(enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: catchupKey(channel),
    queryFn: () => api.getCatchup(channel),
    enabled,
    staleTime: 45_000,
    refetchInterval: enabled ? 120_000 : false,
  });
}

export function useMarkCatchupSeen(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markCatchupSeen(channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: catchupKey(channel) }),
  });
}

export function useCatchupSummary(channel: AgenticChannel = "telegram") {
  return useMutation({
    mutationFn: () => api.getCatchupSummary(channel),
  });
}

export function useTakeoverFollowup(chatId: string | null, enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: ["agentic-takeover-followup", channel, chatId || ""],
    queryFn: () => api.getTakeoverFollowup(chatId as string, channel),
    enabled: enabled && !!chatId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useLeadActions(chatId: string | null, enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: ["agentic-lead-actions", channel, chatId || ""],
    queryFn: () => api.getLeadActions(chatId as string, channel),
    enabled: enabled && !!chatId,
    staleTime: 8_000,
    refetchInterval: enabled && chatId ? 20_000 : false,
  });
}

export function useRevertLeadAction(chatId: string, channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => api.revertLeadAction(actionId, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agentic-lead-actions", channel, chatId] }),
  });
}

export function useSuggestReply(channel: AgenticChannel = "telegram") {
  return useMutation({
    mutationFn: (chatId: string) => api.suggestReply(chatId, channel),
  });
}

export function useSetChatExcluded(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      chatId,
      excluded,
      reason,
    }: {
      chatId: string;
      excluded: boolean;
      reason?: string;
    }) => api.setChatExcluded(chatId, excluded, channel, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKey(channel) });
      qc.invalidateQueries({ queryKey: draftsRoot(channel) });
      qc.invalidateQueries({ queryKey: blacklistKey(channel) });
    },
  });
}

export function useBlacklist(enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: blacklistKey(channel),
    queryFn: () => api.getBlacklist(channel),
    enabled,
    staleTime: 15_000,
  });
}

export function setAgenticSettingsCache(
  qc: QueryClient,
  settings: AgenticSettings,
  channel: AgenticChannel = "telegram",
) {
  qc.setQueryData(settingsKey(channel), settings);
}

export function useKnowledge(enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: knowledgeKey(channel),
    queryFn: () => api.getKnowledge(channel),
    enabled,
    refetchInterval: (q) =>
      (q.state.data || []).some((s) => s.status === "pending" || s.status === "processing") ? 2500 : false,
  });
}

export function useKnowledgeSourceContent(id: string | null, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: [...knowledgeKey(channel), "content", id],
    queryFn: () => api.getKnowledgeContent(id as string, channel),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useAddKnowledgeText(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { title: string; text: string }) => api.addKnowledgeText(v.title, v.text, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKey(channel) }),
  });
}

export function useAddKnowledgeUrl(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.addKnowledgeUrl(url, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKey(channel) }),
  });
}

export function useUploadKnowledge(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadKnowledgeFile(file, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKey(channel) }),
  });
}

export function useAvailableKnowledge(enabled = true, channel: AgenticChannel = "telegram") {
  return useQuery({
    queryKey: [...knowledgeKey(channel), "available"],
    queryFn: () => api.getAvailableKnowledge(channel),
    enabled,
  });
}

export function useSetKnowledgeChannel(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      targetChannel,
      enabled: on,
    }: {
      id: string;
      targetChannel: AgenticChannel;
      enabled: boolean;
    }) => api.setKnowledgeSourceChannel(id, targetChannel, on, channel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agentic-knowledge", "telegram"] });
      qc.invalidateQueries({ queryKey: ["agentic-knowledge", "instagram"] });
    },
  });
}

export function useDeleteKnowledge(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteKnowledge(id, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKey(channel) }),
  });
}

export function useAgentTakeover(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => api.takeOverChat(chatId, channel),
    onSuccess: (_data, chatId) => {
      if (channel === "instagram") {
        patchInstagramChatInCache(qc, chatId, { agentic_paused: true });
      } else {
        patchTelegramChatInCache(qc, chatId, { agentic_paused: true });
      }
      void qc.invalidateQueries({ queryKey: draftsRoot(channel) });
    },
  });
}

export function useAgentResume(channel: AgenticChannel = "telegram") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => api.resumeChat(chatId, channel),
    onSuccess: (_data, chatId) => {
      if (channel === "instagram") {
        patchInstagramChatInCache(qc, chatId, { agentic_paused: false });
      } else {
        patchTelegramChatInCache(qc, chatId, { agentic_paused: false });
      }
    },
  });
}

export function patchTelegramChatInCache(
  qc: QueryClient,
  chatId: string,
  patch: Partial<import("@/features/messages/types").TelegramChat>,
) {
  qc.setQueriesData<{ pages: import("@/features/messages/types").TelegramChat[][]; pageParams: unknown[] }>(
    { queryKey: ["telegram-chats"] },
    (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => page.map((c) => (c.id === chatId ? { ...c, ...patch } : c))),
      };
    },
  );
}

export type {
  AgenticSettings,
  AgenticDraft,
  KnowledgeSource,
  AgenticChannel,
  CopilotMessage,
  ChatRecap,
  CatchupData,
  CatchupItem,
  AgentLeadAction,
  LeadActionsPanel,
} from "@/services/api/agentic";
