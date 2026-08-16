"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { superAgentApi } from "@/services/api/superAgent";
import { subscribeToSuperAgentTasks } from "@/services/realtime/subscriptions";

export function useSuperAgentSettingsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["super-agent-settings", workspaceId],
    queryFn: () => superAgentApi.getSettings(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useSetSuperAgentEnabledMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => superAgentApi.setEnabled(workspaceId!, enabled),
    onSuccess: (data) => {
      queryClient.setQueryData(["super-agent-settings", workspaceId], data);
    },
  });
}

export function useSuperAgentCredentialsQuery(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["super-agent-credentials", workspaceId],
    queryFn: () => superAgentApi.listCredentials(workspaceId!),
    enabled: !!workspaceId && enabled,
    retry: false,
  });
}

export function useCreateSuperAgentCredentialMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      service: string;
      label: string;
      login_url?: string;
      username: string;
      password: string;
      extra?: Record<string, unknown>;
    }) => superAgentApi.createCredential(workspaceId!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-agent-credentials", workspaceId] });
    },
  });
}

export function useDeleteSuperAgentCredentialMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => superAgentApi.deleteCredential(workspaceId!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-agent-credentials", workspaceId] });
    },
  });
}

export function useSuperAgentTasksQuery(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["super-agent-tasks", workspaceId],
    queryFn: () => superAgentApi.listTasks(workspaceId!, 30),
    enabled: !!workspaceId && enabled,
  });
}

export function useSuperAgentTaskQuery(workspaceId: string | null, taskId: string | null, opts: { refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: ["super-agent-task", workspaceId, taskId],
    queryFn: () => superAgentApi.getTask(workspaceId!, taskId!),
    enabled: !!workspaceId && !!taskId,
    refetchInterval: opts.refetchIntervalMs ?? false,
  });
}

export function useCancelSuperAgentTaskMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => superAgentApi.cancelTask(workspaceId!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-agent-tasks", workspaceId] });
    },
  });
}

export function useAnswerSuperAgentTaskMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) => superAgentApi.answerTask(workspaceId!, id, answer),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-agent-tasks", workspaceId] });
    },
  });
}

/** Subscribes to live `super_agent_tasks` row changes over the existing
 * workspace socket channel while `enabled` (mirrors the old frontend's
 * `subscribeRealtime` effect in `SuperAgentPanel.tsx`) — debounced
 * invalidation of the task list/detail queries, not a direct cache write. */
export function useSuperAgentTasksRealtime(workspaceId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!workspaceId || !enabled) return;
    const unsubscribe = subscribeToSuperAgentTasks(queryClient, workspaceId);
    return unsubscribe;
  }, [workspaceId, enabled, queryClient]);
}
