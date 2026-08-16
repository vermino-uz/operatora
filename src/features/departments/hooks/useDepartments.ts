"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { departmentsApi } from "@/services/api/departments";
import type { DepartmentInput, DepartmentMemberInput, WorkspaceGroupStatus } from "@/features/departments/types";

const departmentsKey = ["departments"] as const;
const workspaceGroupKey = ["departments", "workspace-group"] as const;
const botUsernameKey = ["departments", "bot-username"] as const;

export function useDepartmentsQuery(enabled = true) {
  return useQuery({
    queryKey: departmentsKey,
    queryFn: () => departmentsApi.list(),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateDepartmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DepartmentInput) => departmentsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentsKey }),
  });
}

export function useUpdateDepartmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DepartmentInput> }) =>
      departmentsApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentsKey }),
  });
}

export function useDeleteDepartmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentsKey }),
  });
}

export function useAddDepartmentMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, input }: { departmentId: string; input: DepartmentMemberInput }) =>
      departmentsApi.addMember(departmentId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentsKey }),
  });
}

export function useUpdateDepartmentMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      departmentId,
      memberId,
      patch,
    }: {
      departmentId: string;
      memberId: string;
      patch: Partial<DepartmentMemberInput>;
    }) => departmentsApi.updateMember(departmentId, memberId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentsKey }),
  });
}

export function useRemoveDepartmentMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, memberId }: { departmentId: string; memberId: string }) =>
      departmentsApi.removeMember(departmentId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentsKey }),
  });
}

export function useDepartmentBotUsernameQuery() {
  return useQuery({
    queryKey: botUsernameKey,
    queryFn: () => departmentsApi.getBotUsername(),
    staleTime: 5 * 60_000,
    select: (d) => d.bot_username,
  });
}

/** The workspace's one shared escalation group — every group-mode department posts there. */
export function useWorkspaceGroupQuery() {
  return useQuery({
    queryKey: workspaceGroupKey,
    queryFn: () => departmentsApi.getWorkspaceGroup(),
    staleTime: 10_000,
    // Auto-poll while a group-connect code is pending, so "/connect <code>"
    // sent in Telegram shows up here without reopening the panel — mirrors
    // the old frontend's `useWorkspaceGroup` exactly.
    refetchInterval: (query) => {
      const data = query.state.data as WorkspaceGroupStatus | undefined;
      const pending =
        data?.group_verify_code &&
        data?.group_verify_expires_at &&
        new Date(data.group_verify_expires_at).getTime() > Date.now();
      return pending ? 3000 : false;
    },
  });
}

export function useGenerateWorkspaceGroupVerifyCodeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => departmentsApi.generateWorkspaceGroupVerifyCode(),
    // Write the fresh code straight into the cache — invalidate only
    // schedules a refetch, and a stale in-flight GET could overwrite the
    // just-issued code with the previous (already-expired) one.
    onSuccess: (data) => qc.setQueryData(workspaceGroupKey, data.group),
  });
}

export function useRefineRoutingPromptMutation() {
  return useMutation({
    mutationFn: ({ id, routingPrompt }: { id: string; routingPrompt: string }) =>
      departmentsApi.refineRoutingPrompt(id, routingPrompt),
  });
}

export function useSendDepartmentTestMessageMutation() {
  return useMutation({
    mutationFn: (id: string) => departmentsApi.sendTestMessage(id),
  });
}
