"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadTasksApi } from "@/services/api/leadTasks";
import type { LeadTaskType } from "@/features/leads/types";

function tasksKey(leadId: string) {
  return ["lead-tasks", leadId] as const;
}

export function useLeadTasksQuery(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: tasksKey(leadId),
    queryFn: () => leadTasksApi.listForLead(leadId),
    enabled: enabled && Boolean(leadId),
  });
}

export function useLeadTaskAssigneesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["lead-task-assignees"],
    queryFn: () => leadTasksApi.listAssignees(),
    enabled,
  });
}

export function useLeadTaskMutations(leadId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: tasksKey(leadId) });

  const create = useMutation({
    mutationFn: (payload: {
      title: string;
      task_type: LeadTaskType;
      due_at: string;
      assigned_operator_id?: string | null;
    }) => leadTasksApi.create({ ...payload, lead_id: leadId }),
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: ({ taskId, closureComment }: { taskId: string; closureComment: string }) =>
      leadTasksApi.complete(taskId, closureComment),
    onSuccess: invalidate,
  });

  return { create, complete };
}
