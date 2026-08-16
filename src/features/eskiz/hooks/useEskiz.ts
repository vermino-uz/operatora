"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { eskizApi } from "@/services/api/eskiz";
import type { EskizConnectInput, EskizReportPeriod, EskizTopUpProvider } from "@/features/eskiz/types";

const ACCOUNT_KEY = (workspaceId: string | null) => ["eskiz-account", workspaceId] as const;
const GUIDANCE_KEY = ["eskiz-guidance"] as const;
const TEMPLATES_KEY = (workspaceId: string | null) => ["eskiz-templates", workspaceId] as const;
const HISTORY_KEY = (
  workspaceId: string | null,
  opts: { status?: string; period?: EskizReportPeriod; page?: number },
) => ["eskiz-history", workspaceId, opts.status ?? null, opts.period ?? "all", opts.page ?? 1] as const;
const REPORTS_KEY = (workspaceId: string | null, period: EskizReportPeriod) =>
  ["eskiz-reports", workspaceId, period] as const;

export function useEskizAccountQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ACCOUNT_KEY(workspaceId),
    queryFn: () => eskizApi.getAccount(),
    enabled: !!workspaceId,
  });
}

export function useEskizGuidanceQuery() {
  return useQuery({
    queryKey: GUIDANCE_KEY,
    queryFn: () => eskizApi.getGuidance(),
    // Static pricing/help copy — never changes within a session, no need to refetch.
    staleTime: Infinity,
  });
}

export function useEskizTemplatesQuery(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: TEMPLATES_KEY(workspaceId),
    queryFn: () => eskizApi.listTemplates(),
    enabled: !!workspaceId && enabled,
  });
}

export function useEskizHistoryQuery(
  workspaceId: string | null,
  opts: { status?: string; period?: EskizReportPeriod; page?: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: HISTORY_KEY(workspaceId, opts),
    queryFn: () => eskizApi.getHistory(opts),
    enabled: !!workspaceId && enabled,
    placeholderData: (prev) => prev,
  });
}

export function useEskizReportsQuery(workspaceId: string | null, period: EskizReportPeriod, enabled: boolean) {
  return useQuery({
    queryKey: REPORTS_KEY(workspaceId, period),
    queryFn: () => eskizApi.getReports(period),
    enabled: !!workspaceId && enabled,
  });
}

function invalidateAccount(qc: ReturnType<typeof useQueryClient>, workspaceId: string | null) {
  qc.invalidateQueries({ queryKey: ACCOUNT_KEY(workspaceId) });
}
function invalidateTemplates(qc: ReturnType<typeof useQueryClient>, workspaceId: string | null) {
  qc.invalidateQueries({ queryKey: TEMPLATES_KEY(workspaceId) });
}

export function useConnectEskizMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EskizConnectInput) => eskizApi.connect(input),
    onSuccess: () => invalidateAccount(qc, workspaceId),
  });
}

export function useDisconnectEskizMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => eskizApi.disconnect(),
    onSuccess: () => invalidateAccount(qc, workspaceId),
  });
}

export function useSyncEskizBalanceMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => eskizApi.syncBalance(),
    onSuccess: () => invalidateAccount(qc, workspaceId),
  });
}

export function useSubmitEskizTemplateMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => eskizApi.submitTemplate(content),
    onSuccess: () => invalidateTemplates(qc, workspaceId),
  });
}

export function useSyncEskizTemplatesMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => eskizApi.syncTemplates(),
    onSuccess: () => invalidateTemplates(qc, workspaceId),
  });
}

export function useResubmitEskizTemplateMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eskizApi.resubmitTemplate(id),
    onSuccess: () => invalidateTemplates(qc, workspaceId),
  });
}

export function useEskizTopUpMutation() {
  // Deliberately not invalidating the account query on success: the top-up
  // is asynchronous (payment provider callback/webhook updates the balance
  // server-side later), so there's nothing new to read yet — the existing
  // "Refresh balance" button (`useSyncEskizBalanceMutation`) is how the user
  // confirms it landed, matching the old frontend's own flow (no polling).
  return useMutation({
    mutationFn: ({ amountUzs, provider }: { amountUzs: number; provider: EskizTopUpProvider }) =>
      eskizApi.topUp(amountUzs, provider),
  });
}
