"use client";

import { useQuery } from "@tanstack/react-query";

import { tasksApi } from "@/services/api/tasks";
import type { TaskScope } from "@/features/tasks/types";

/** 30s poll — matches the old frontend's own `refetchInterval` on this
 * exact query (`pages/Tasks.tsx`). TanStack Query already pauses interval
 * polling while the tab/window isn't focused (`refetchIntervalInBackground`
 * defaults to `false`), so this doesn't flood the backend from background
 * tabs — no extra flood-prevention wiring needed beyond the project
 * default. */
export function useTasksQuery(scope: TaskScope) {
  return useQuery({
    queryKey: ["operator-tasks", scope],
    queryFn: () => tasksApi.list(scope),
    refetchInterval: 30_000,
  });
}

export function useTaskAssigneesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["task-assignees"],
    queryFn: () => tasksApi.assignees(),
    enabled,
    staleTime: 60_000,
  });
}
