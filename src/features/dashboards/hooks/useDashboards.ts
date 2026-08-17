"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { customDashboardsApi } from "@/services/api/customDashboards";

const metaKey = ["custom-dashboards-meta"] as const;
const listKey = ["custom-dashboards-list"] as const;
const oneKey = (id: string) => ["custom-dashboard", id] as const;

/** This app's UI copy is English-only (no i18n layer, per ARCHITECTURE.md) —
 * unlike the old frontend (uz/ru/en, defaulting uz), always sends "en" so
 * the AI's generated titles/summaries match the rest of this app's copy. */
const LANG = "en";

export function useDashboardMetaQuery() {
  return useQuery({ queryKey: metaKey, queryFn: () => customDashboardsApi.meta(), staleTime: 30_000 });
}

export function useDashboardListQuery() {
  return useQuery({ queryKey: listKey, queryFn: () => customDashboardsApi.list(), staleTime: 15_000 });
}

export function useDashboardQuery(id: string | null) {
  return useQuery({
    queryKey: oneKey(id ?? ""),
    queryFn: () => customDashboardsApi.get(id as string),
    enabled: Boolean(id),
    staleTime: 10_000,
    // A reopened dashboard should refresh its live-resolved widget data,
    // not silently reuse the previous cache entry.
    refetchOnMount: "always",
  });
}

export function useGenerateDashboardMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prompt: string) => customDashboardsApi.generate(prompt, LANG),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: listKey });
      void qc.invalidateQueries({ queryKey: metaKey });
      qc.setQueryData(oneKey(res.dashboard.id), res);
    },
  });
}

export function useEditDashboardMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prompt: string) => customDashboardsApi.edit(id, prompt, LANG),
    onSuccess: (res) => {
      qc.setQueryData(oneKey(id), { dashboard: res.dashboard, resolved: res.resolved });
      void qc.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useDeleteDashboardMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customDashboardsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: listKey });
      void qc.invalidateQueries({ queryKey: metaKey });
    },
  });
}
