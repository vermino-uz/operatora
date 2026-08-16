"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { taskSettingsApi } from "@/services/api/taskSettings";
import { DEFAULT_TASK_MODULE_SETTINGS, type TaskModuleSettings } from "@/features/tasks-settings/types";

const QUERY_KEY = ["task-module-settings"] as const;

export function useTaskModuleSettingsQuery() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => taskSettingsApi.get(),
    staleTime: 30_000,
  });
}

export function useUpdateTaskModuleSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: TaskModuleSettings) => taskSettingsApi.update(settings),
    onSuccess: (data) => qc.setQueryData(QUERY_KEY, data),
  });
}

export { DEFAULT_TASK_MODULE_SETTINGS };
