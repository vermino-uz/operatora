"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { telegramAccountApi, type TelegramAccountProtocol } from "@/services/api/telegramAccount";
import { telegramMessagesApi } from "@/services/api/telegramMessages";

const SETTINGS_KEY = ["telegram-account-settings"] as const;
const FOLDERS_KEY = (workspaceId: string) => ["telegram-account-folders", workspaceId] as const;

export function useTelegramAccountSettingsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceId ? [...SETTINGS_KEY, workspaceId] : ["telegram-account-settings-disabled"],
    queryFn: () => telegramAccountApi.getSettings(),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}

export function useTelegramAccountFoldersQuery(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: workspaceId ? FOLDERS_KEY(workspaceId) : ["telegram-account-folders-disabled"],
    queryFn: () => telegramAccountApi.listFolders(),
    enabled: Boolean(workspaceId) && enabled,
    staleTime: 30_000,
  });
}

export function useTelegramAccountContactsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["telegram-account-contacts"],
    queryFn: () => telegramAccountApi.listContacts(),
    enabled,
    staleTime: 30_000,
  });
}

export function useTelegramAccountSyncMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => telegramAccountApi.syncInbox(),
    onSuccess: () => {
      if (workspaceId) {
        void queryClient.invalidateQueries({ queryKey: ["telegram-chats", workspaceId] });
        void queryClient.invalidateQueries({ queryKey: FOLDERS_KEY(workspaceId) });
        void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      }
    },
  });
}

export function useTelegramAccountDisconnectMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deleteConversations: boolean) => telegramAccountApi.disconnect(deleteConversations),
    onSuccess: () => {
      if (workspaceId) {
        void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
        void queryClient.invalidateQueries({ queryKey: ["telegram-chats", workspaceId] });
      }
    },
  });
}

export function useTelegramStartChatMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload:
        | { kind: "phone"; phone: string; keep_contact?: boolean }
        | { kind: "user"; user_id: number }
        | { kind: "username"; username: string },
    ) => {
      if (payload.kind === "phone") {
        return telegramAccountApi.startChatByPhone({ phone: payload.phone, keep_contact: payload.keep_contact });
      }
      if (payload.kind === "username") {
        const chat = await telegramMessagesApi.startChatByUsername(payload.username);
        return { chat: { id: chat.id } };
      }
      return telegramAccountApi.startChatById(payload.user_id);
    },
    onSuccess: () => {
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: ["telegram-chats", workspaceId] });
    },
  });
}

export function useTelegramAccountAddContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { phone: string; first_name?: string; last_name?: string }) => telegramAccountApi.addContact(payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["telegram-account-contacts"] }),
  });
}

export function useTelegramPhoneCheckQuery(phone: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["telegram-phone-check", phone],
    queryFn: () => telegramAccountApi.checkPhone(phone!),
    enabled: enabled && Boolean(phone),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export type { TelegramAccountProtocol };
