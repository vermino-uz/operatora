"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { googleSheetsApi } from "@/services/api/googleSheets";
import type {
  CreateImportSourceInput,
  UpdateExportConfigInput,
  UpdateImportConfigInput,
} from "@/features/google-sheets/types";

function statusKey(workspaceId: string | null) {
  return ["google-sheets-status", workspaceId] as const;
}

function importSourcesKey(workspaceId: string | null) {
  return ["google-sheets-import-sources", workspaceId] as const;
}

export function useGoogleSheetsStatusQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: statusKey(workspaceId),
    queryFn: () => googleSheetsApi.status(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 15_000,
  });
}

export function useGoogleSheetsOAuthUrlMutation(workspaceId: string | null) {
  return useMutation({
    mutationFn: (redirectUri: string) => googleSheetsApi.getOAuthUrl(workspaceId as string, redirectUri),
  });
}

export function useDisconnectGoogleSheetsMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => googleSheetsApi.disconnect(workspaceId as string),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: statusKey(workspaceId) });
      void qc.invalidateQueries({ queryKey: importSourcesKey(workspaceId) });
    },
  });
}

export function useGoogleSpreadsheetsQuery(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["google-sheets-spreadsheets", workspaceId],
    queryFn: () => googleSheetsApi.listSpreadsheets(workspaceId as string),
    enabled: enabled && Boolean(workspaceId),
    staleTime: 30_000,
  });
}

export function useGoogleSheetTabsQuery(workspaceId: string | null, spreadsheetId: string) {
  return useQuery({
    queryKey: ["google-sheets-tabs", workspaceId, spreadsheetId],
    queryFn: () => googleSheetsApi.listTabs(workspaceId as string, spreadsheetId),
    enabled: Boolean(workspaceId) && Boolean(spreadsheetId),
    staleTime: 30_000,
  });
}

export function useGoogleSheetPreviewQuery(workspaceId: string | null, spreadsheetId: string, tabName: string) {
  return useQuery({
    queryKey: ["google-sheets-preview", workspaceId, spreadsheetId, tabName],
    queryFn: () => googleSheetsApi.previewRows(workspaceId as string, spreadsheetId, tabName),
    enabled: Boolean(workspaceId) && Boolean(spreadsheetId),
    staleTime: 10_000,
  });
}

export function useUpdatePrimarySheetMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { spreadsheet_id_or_url: string; sheet_tab_name: string }) =>
      googleSheetsApi.updateConfig({ workspace_id: workspaceId as string, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey(workspaceId) }),
  });
}

export function useUpdateImportConfigMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateImportConfigInput) =>
      googleSheetsApi.updateImportConfig(workspaceId as string, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey(workspaceId) }),
  });
}

export function useImportToBoardMutation(workspaceId: string | null) {
  return useMutation({
    mutationFn: (input: { board_id: string; column_id?: string }) =>
      googleSheetsApi.importToBoard({ workspace_id: workspaceId as string, ...input }),
  });
}

export function useGoogleSheetsImportSourcesQuery(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: importSourcesKey(workspaceId),
    queryFn: () => googleSheetsApi.listImportSources(workspaceId as string),
    enabled: enabled && Boolean(workspaceId),
    staleTime: 15_000,
  });
}

export function useCreateImportSourceMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateImportSourceInput) => googleSheetsApi.createImportSource(workspaceId as string, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: importSourcesKey(workspaceId) }),
  });
}

export function useUpdateImportSourceMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateImportSourceInput> }) =>
      googleSheetsApi.updateImportSource(workspaceId as string, id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: importSourcesKey(workspaceId) }),
  });
}

export function useDeleteImportSourceMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => googleSheetsApi.deleteImportSource(workspaceId as string, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: importSourcesKey(workspaceId) }),
  });
}

export function useUpdateExportConfigMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateExportConfigInput) => googleSheetsApi.updateExportConfig(workspaceId as string, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey(workspaceId) }),
  });
}

export function useCreateExportSheetMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => googleSheetsApi.createExportSheet(workspaceId as string),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey(workspaceId) }),
  });
}

export function useExportBoardMutation(workspaceId: string | null) {
  return useMutation({
    mutationFn: (boardId: string) => googleSheetsApi.exportBoard(workspaceId as string, boardId),
  });
}
