"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadAutomationsApi } from "@/services/api/leadAutomations";
import { teamApi } from "@/services/api/team";
import type { AutomationRuleRow } from "@/features/lead-automations/types";

function rulesKey(workspaceId: string | null) {
  return ["lead-automation-rules", workspaceId ?? "none"] as const;
}

export function useAutomationRulesQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: rulesKey(workspaceId),
    queryFn: () => leadAutomationsApi.list(),
    enabled: Boolean(workspaceId),
  });
}

export function useSaveAutomationRuleMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: Record<string, unknown> }) =>
      id ? leadAutomationsApi.update(id, payload) : leadAutomationsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesKey(workspaceId) }),
  });
}

export function useDeleteAutomationRuleMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadAutomationsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesKey(workspaceId) }),
  });
}

export function useToggleAutomationRuleMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => leadAutomationsApi.setActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesKey(workspaceId) }),
  });
}

export function useUnpauseAutomationRuleMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: AutomationRuleRow) => leadAutomationsApi.unpause(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesKey(workspaceId) }),
  });
}

export function useAutomationRunHistoryQuery(ruleId: string | null) {
  return useQuery({
    queryKey: ["lead-automation-runs", ruleId ?? "none"],
    queryFn: () => leadAutomationsApi.runHistory(ruleId as string),
    enabled: Boolean(ruleId),
  });
}

export function useLeadTagsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["lead-tags", workspaceId ?? "none"],
    queryFn: () => leadAutomationsApi.listTags(),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });
}

/** Reuses Team Members' real `GET /admin-users/operators` (not a db-proxy
 * table) — the same operator roster already used for RBAC assignment,
 * mapped down to `{id, operator_name}` for the automation builder's
 * assign/notify pickers. */
export function useAutomationOperatorsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["lead-automation-operators", workspaceId ?? "none"],
    queryFn: async () => {
      const members = await teamApi.list(workspaceId as string);
      return members.map((m) => ({ id: m.user_id, operator_name: m.full_name || m.email }));
    },
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });
}
