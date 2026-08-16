"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { telegramApi } from "@/services/api/telegram";

const QUERY_KEY = (workspaceId: string | null) => ["telegram-integrations", workspaceId] as const;

export function useTelegramIntegrationsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: QUERY_KEY(workspaceId),
    queryFn: () => telegramApi.list(),
    enabled: !!workspaceId,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string | null) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEY(workspaceId) });
}

export function useCreateTelegramIntegrationMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (botToken: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return telegramApi.create(workspaceId, botToken);
    },
    onSuccess: () => invalidate(queryClient, workspaceId),
  });
}

export function useUpdateTelegramBotTokenMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, botToken }: { id: string; botToken: string }) =>
      telegramApi.updateBotToken(id, botToken),
    onSuccess: () => invalidate(queryClient, workspaceId),
  });
}

export function useRemoveTelegramIntegrationMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => telegramApi.remove(id),
    onSuccess: () => invalidate(queryClient, workspaceId),
  });
}

export function useTestTelegramBotMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => telegramApi.test(id),
    onSuccess: () => invalidate(queryClient, workspaceId),
  });
}

export function useSetTelegramWebhookMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => telegramApi.setWebhook(id),
    onSuccess: () => invalidate(queryClient, workspaceId),
  });
}

export function useRemoveTelegramWebhookMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => telegramApi.removeWebhook(id),
    onSuccess: () => invalidate(queryClient, workspaceId),
  });
}

export function useTelegramWebhookInfoMutation() {
  // Deliberately a mutation, not a query: the old frontend only calls this
  // on-demand ("Check Status" button), it's a live upstream Telegram API
  // call (not cached workspace data) and firing it automatically/on an
  // interval would flood the Telegram Bot API needlessly.
  return useMutation({
    mutationFn: (id: string) => telegramApi.webhookInfo(id),
  });
}
