"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tasksApi } from "@/services/api/tasks";
import type { CreateTaskInput } from "@/features/tasks/types";

/** Invalidates every `operator-tasks` scope (mine + team) — a created/
 * completed task can affect either list's membership. Mutations never
 * auto-retry (project default, `services/api/query-client.ts`). */
export function useCreateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["operator-tasks"] });
    },
  });
}

export function useCompleteTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, closureComment }: { id: string; closureComment: string }) =>
      tasksApi.complete(id, closureComment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["operator-tasks"] });
    },
  });
}
