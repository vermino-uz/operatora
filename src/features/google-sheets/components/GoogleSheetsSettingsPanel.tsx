"use client";

import { useState } from "react";
import { Button, Label, ListBox, Select, Switch } from "@heroui/react";
import { LayoutCells, Plus, ArrowUpRightFromSquare, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useSessionStore } from "@/state/session-store";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { openOAuthPopup } from "@/lib/oauthPopup";
import {
  IMPORT_FIELD_LABELS,
  IMPORT_MAPPABLE_FIELDS,
  type InitialImportMode,
} from "@/features/google-sheets/types";
import {
  useCreateExportSheetMutation,
  useCreateImportSourceMutation,
  useUpdateImportSourceMutation,
  useDeleteImportSourceMutation,
  useDisconnectGoogleSheetsMutation,
  useExportBoardMutation,
  useGoogleSheetPreviewQuery,
  useGoogleSheetTabsQuery,
  useGoogleSheetsImportSourcesQuery,
  useGoogleSheetsOAuthUrlMutation,
  useGoogleSheetsStatusQuery,
  useGoogleSpreadsheetsQuery,
  useImportToBoardMutation,
  useUpdateExportConfigMutation,
  useUpdateImportConfigMutation,
  useUpdatePrimarySheetMutation,
} from "@/features/google-sheets/hooks/useGoogleSheets";
import { useLeadsBoardColumnsQuery, useLeadsBoardsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import { AddImportSourceModal } from "@/features/google-sheets/components/AddImportSourceModal";
import { ImportSourceRow } from "@/features/google-sheets/components/ImportSourceRow";
import { ExistingLeadsDialog } from "@/features/google-sheets/components/ExistingLeadsDialog";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Google Sheets — see `features/google-sheets/types.ts` for the full
 * contract trace. One shared workspace Google connection drives both an
 * import path (primary sheet + additional named sources, each with its own
 * board/column/field mapping and optional realtime Drive-webhook sync) and
 * an export path (create/link a spreadsheet, one-time board sync, or
 * auto-append). OAuth: popup + `/google-sheets-callback`, same
 * popup-vs-full-navigation detection via `window.opener` as Google
 * Calendar (see that panel's doc comment — this backend's OAuth state also
 * has no client-controlled `popup` field).
 */
export function GoogleSheetsSettingsPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const statusQuery = useGoogleSheetsStatusQuery(workspaceId);
  const oauthUrl = useGoogleSheetsOAuthUrlMutation(workspaceId);
  const disconnect = useDisconnectGoogleSheetsMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const shellProps = { title: "Google Sheets", subtitle: "Import leads from a spreadsheet, or export your CRM leads to one." } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <EmptyState title="No workspace selected" description="Select a workspace to manage Google Sheets." />
      </SettingsSectionShell>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading Google Sheets status…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (statusQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  const connected = statusQuery.data?.connected ?? false;
  const integration = statusQuery.data?.integration ?? null;

  async function handleConnect() {
    if (oauthUrl.isPending) return;
    setError(null);
    try {
      const redirectUri = `${window.location.origin}/google-sheets-callback`;
      const { authUrl } = await oauthUrl.mutateAsync(redirectUri);
      const popup = openOAuthPopup(authUrl, "operatora-google-sheets-oauth");
      if (!popup) {
        window.location.href = authUrl;
        return;
      }
      const poll = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(poll);
          void statusQuery.refetch();
        }
      }, 500);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleDisconnect() {
    if (disconnect.isPending) return;
    setError(null);
    try {
      await disconnect.mutateAsync();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  return (
    <SettingsSectionShell {...shellProps} wide>
      <div className="flex max-w-[880px] flex-col gap-6">
        <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
          <p className="text-sm font-semibold text-foreground">Google account</p>
          <p className="mt-1 text-xs text-foreground/60">
            Sign in once — Operatora reads and writes your spreadsheets using secure OAuth.
          </p>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <div className="mt-3">
            {!connected ? (
              <Button isDisabled={oauthUrl.isPending} onPress={handleConnect}>
                <LayoutCells className="size-4" aria-hidden="true" />
                {oauthUrl.isPending ? "Opening Google…" : "Connect Google account"}
              </Button>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-foreground/70">{integration?.google_email ?? "Account connected"}</p>
                <Button size="sm" variant="danger-soft" isDisabled={disconnect.isPending} onPress={handleDisconnect}>
                  <TrashBin className="size-3.5" aria-hidden="true" />
                  {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {connected ? (
          <>
            <PrimaryImportSection workspaceId={workspaceId} />
            <AdditionalSourcesSection workspaceId={workspaceId} connected={connected} />
            <ExportSection workspaceId={workspaceId} />
          </>
        ) : null}
      </div>
    </SettingsSectionShell>
  );
}

function BoardSelect({
  workspaceId,
  value,
  onChange,
  disabled,
}: {
  workspaceId: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const boardsQuery = useLeadsBoardsQuery(workspaceId, true);
  const boards = boardsQuery.data ?? [];
  return (
    <Select
      aria-label="Target board"
      value={value}
      onChange={(key) => typeof key === "string" && onChange(key)}
      isDisabled={disabled || boardsQuery.isLoading}
    >
      <Label>Target board</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox
          items={
            boards.length === 0
              ? [{ id: "", label: boardsQuery.isLoading ? "Loading…" : "No boards — create one in Leads" }]
              : [{ id: "", label: "Choose target board…" }, ...boards.map((b) => ({ id: b.id, label: b.name }))]
          }
        >
          {(opt) => (
            <ListBox.Item id={opt.id} textValue={opt.label}>
              {opt.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function PrimaryImportSection({ workspaceId }: { workspaceId: string }) {
  const statusQuery = useGoogleSheetsStatusQuery(workspaceId);
  const integration = statusQuery.data?.integration ?? null;
  const spreadsheetsQuery = useGoogleSpreadsheetsQuery(workspaceId, true);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState(integration?.spreadsheet_id ?? "");
  const [selectedTab, setSelectedTab] = useState(integration?.sheet_tab_name || "Leads");
  const tabsQuery = useGoogleSheetTabsQuery(workspaceId, selectedSpreadsheetId);
  const previewQuery = useGoogleSheetPreviewQuery(workspaceId, selectedSpreadsheetId, selectedTab);
  const saveSelection = useUpdatePrimarySheetMutation(workspaceId);
  const updateImportConfig = useUpdateImportConfigMutation(workspaceId);
  const importToBoard = useImportToBoardMutation(workspaceId);
  const boardsQuery = useLeadsBoardsQuery(workspaceId, true);
  const columnsQuery = useLeadsBoardColumnsQuery(integration?.import_board_id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEnable, setPendingEnable] = useState<{ boardId: string; columnId: string } | null>(null);

  const hasLinkedSheet = !!(integration?.spreadsheet_id || selectedSpreadsheetId);

  async function persistSheet(spreadsheetId: string, tab: string) {
    setError(null);
    try {
      await saveSelection.mutateAsync({ spreadsheet_id_or_url: spreadsheetId, sheet_tab_name: tab || "Leads" });
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function onPickSpreadsheet(id: string) {
    setSelectedSpreadsheetId(id);
    setSelectedTab("Leads");
    await persistSheet(id, "Leads");
  }

  async function onPickTab(tab: string) {
    setSelectedTab(tab);
    await persistSheet(selectedSpreadsheetId, tab);
  }

  async function setAutoImport(
    enabled: boolean,
    boardId?: string,
    columnId?: string,
    initialMode?: InitialImportMode,
  ) {
    const targetBoard = boardId ?? integration?.import_board_id ?? "";
    const targetColumn = columnId ?? integration?.import_column_id ?? "";
    if (enabled && !targetBoard) {
      setError("Choose a target board for realtime import.");
      return;
    }
    if (enabled && !hasLinkedSheet) {
      setError("Select a spreadsheet and tab first.");
      return;
    }
    if (
      enabled &&
      !initialMode &&
      previewQuery.data?.hasExistingRows &&
      !previewQuery.data.hasBaseline
    ) {
      setPendingEnable({ boardId: targetBoard, columnId: targetColumn });
      return;
    }
    setError(null);
    try {
      await updateImportConfig.mutateAsync({
        auto_import_new_leads: enabled,
        import_board_id: targetBoard || null,
        import_column_id: targetColumn || null,
        ...(initialMode ? { initial_import_mode: initialMode } : {}),
      });
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function resolveImportAll() {
    if (!pendingEnable) return;
    setError(null);
    try {
      const res = await importToBoard.mutateAsync({ board_id: pendingEnable.boardId, column_id: pendingEnable.columnId || undefined });
      await setAutoImport(true, pendingEnable.boardId, pendingEnable.columnId, "import_all");
      setError(null);
      void res;
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPendingEnable(null);
    }
  }

  async function resolveSkipExisting() {
    if (!pendingEnable) return;
    await setAutoImport(true, pendingEnable.boardId, pendingEnable.columnId, "skip_existing");
    setPendingEnable(null);
  }

  async function onFieldMappingChange(field: string, header: string) {
    const next = { ...(integration?.field_mapping ?? {}) };
    if (header) next[field] = header;
    else delete next[field];
    setError(null);
    try {
      await updateImportConfig.mutateAsync({ field_mapping: next });
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function onToggleIgnoredColumn(header: string, ignored: boolean) {
    const current = integration?.ignored_columns ?? [];
    const next = ignored ? Array.from(new Set([...current, header])) : current.filter((h) => h !== header);
    setError(null);
    try {
      await updateImportConfig.mutateAsync({ ignored_columns: next });
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  const spreadsheets = spreadsheetsQuery.data ?? [];
  const tabs = tabsQuery.data ?? [];
  const saving = saveSelection.isPending || updateImportConfig.isPending;

  return (
    <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
      <p className="text-sm font-semibold text-foreground">Lead import</p>
      <p className="mt-1 text-xs text-foreground/60">
        Pull leads from an existing spreadsheet into your CRM board. Row 1 should be headers (e.g.
        first_name, phone_number).
      </p>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

      <div className="mt-3 flex flex-col gap-4">
        <Select
          aria-label="Spreadsheet"
          value={selectedSpreadsheetId}
          onChange={(key) => typeof key === "string" && key && void onPickSpreadsheet(key)}
          isDisabled={spreadsheetsQuery.isLoading}
        >
          <Label>Spreadsheet</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox
              items={
                spreadsheets.length === 0
                  ? [{ id: "", label: spreadsheetsQuery.isLoading ? "Loading…" : "No spreadsheets found" }]
                  : [{ id: "", label: "Choose a spreadsheet…" }, ...spreadsheets.map((s) => ({ id: s.id, label: s.name }))]
              }
            >
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>

        {selectedSpreadsheetId ? (
          <Select
            aria-label="Worksheet tab"
            value={selectedTab}
            onChange={(key) => typeof key === "string" && void onPickTab(key)}
            isDisabled={tabsQuery.isLoading}
          >
            <Label>Worksheet tab</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox items={(tabs.length === 0 ? [selectedTab || "Leads"] : tabs).map((t) => ({ id: t, label: t }))}>
                {(opt) => (
                  <ListBox.Item id={opt.id} textValue={opt.label}>
                    {opt.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                )}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : null}

        {hasLinkedSheet ? (
          <div className="flex flex-col gap-4 border-t border-black/[0.06] pt-4 dark:border-white/[0.08]">
            <BoardSelect
              workspaceId={workspaceId}
              value={integration?.import_board_id ?? ""}
              onChange={(boardId) => void setAutoImport(!!integration?.auto_import_new_leads, boardId, "")}
              disabled={saving}
            />

            {integration?.import_board_id ? (
              <Select
                aria-label="Target column"
                value={integration.import_column_id ?? ""}
                onChange={(key) =>
                  typeof key === "string" &&
                  void setAutoImport(!!integration.auto_import_new_leads, integration.import_board_id ?? "", key)
                }
                isDisabled={saving || columnsQuery.isLoading}
              >
                <Label>Target column</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox
                    items={[
                      { id: "", label: "First column (default)" },
                      ...(columnsQuery.data ?? []).map((c) => ({ id: c.id, label: c.name })),
                    ]}
                  >
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : null}

            {previewQuery.data?.headers.length ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-foreground">Column mapping</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {IMPORT_MAPPABLE_FIELDS.map((field) => (
                    <Select
                      key={field}
                      aria-label={IMPORT_FIELD_LABELS[field]}
                      value={integration?.field_mapping?.[field] ?? ""}
                      onChange={(key) => typeof key === "string" && void onFieldMappingChange(field, key)}
                      isDisabled={saving}
                    >
                      <Label>{IMPORT_FIELD_LABELS[field]}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox
                          items={[
                            { id: "", label: "Not mapped" },
                            ...previewQuery.data!.headers.map((h) => ({ id: h, label: h })),
                          ]}
                        >
                          {(opt) => (
                            <ListBox.Item id={opt.id} textValue={opt.label}>
                              {opt.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          )}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  ))}
                </div>
              </div>
            ) : null}

            {previewQuery.data?.headers.length ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-foreground">Ignored columns</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {previewQuery.data.headers.map((header) => (
                    <label key={header} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={(integration?.ignored_columns ?? []).includes(header)}
                        disabled={saving}
                        onChange={(e) => void onToggleIgnoredColumn(header, e.target.checked)}
                        className="size-3.5"
                      />
                      <span className="truncate">{header}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="text-foreground">Auto-sync new rows</span>
                <span className="mt-0.5 block text-xs text-foreground/50">
                  {!hasLinkedSheet || !integration?.import_board_id
                    ? "Select spreadsheet, tab, and target board first."
                    : integration?.realtime_sync_active
                      ? "Webhook active — changes sync within seconds."
                      : undefined}
                </span>
              </span>
              <Switch
                isSelected={!!integration?.auto_import_new_leads}
                isDisabled={saving}
                onChange={(v) => void setAutoImport(v)}
                aria-label="Auto-sync new rows"
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </label>

            {integration?.last_import_at ? (
              <p className="text-xs text-foreground/50">
                Last sync: {new Date(integration.last_import_at).toLocaleString()}
                {integration.last_import_stats?.imported != null
                  ? ` — +${integration.last_import_stats.imported} imported`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <ExistingLeadsDialog
        open={!!pendingEnable}
        rowCount={previewQuery.data?.rowCount ?? 0}
        busy={importToBoard.isPending || updateImportConfig.isPending}
        onImportAll={() => void resolveImportAll()}
        onSkipExisting={() => void resolveSkipExisting()}
        onClose={() => setPendingEnable(null)}
      />

      {boardsQuery.isError ? <ErrorState error={boardsQuery.error} className="mt-2 py-2" /> : null}
    </div>
  );
}

function AdditionalSourcesSection({ workspaceId, connected }: { workspaceId: string; connected: boolean }) {
  const sourcesQuery = useGoogleSheetsImportSourcesQuery(workspaceId, connected);
  const boardsQuery = useLeadsBoardsQuery(workspaceId, true);
  const spreadsheetsQuery = useGoogleSpreadsheetsQuery(workspaceId, connected);
  const createSource = useCreateImportSourceMutation(workspaceId);
  const updateSource = useUpdateImportSourceMutation(workspaceId);
  const deleteSource = useDeleteImportSourceMutation(workspaceId);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sourcesQuery.isLoading) return <LoadingState label="Loading import sources…" className="py-6" />;
  if (sourcesQuery.isError) {
    return <ErrorState error={sourcesQuery.error} onRetry={() => sourcesQuery.refetch()} className="py-6" />;
  }

  const sources = sourcesQuery.data ?? [];
  const boards = boardsQuery.data ?? [];

  return (
    <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Additional sheets</p>
          <p className="mt-1 text-xs text-foreground/60">
            Pull leads from more spreadsheets under this same connected Google account.
          </p>
        </div>
        <Button size="sm" onPress={() => setModalOpen(true)}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add sheet
        </Button>
      </div>

      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

      <div className="mt-3 flex flex-col gap-2">
        {sources.length === 0 ? (
          <p className="text-xs text-foreground/50">
            No additional sheets yet. Each one can auto-sync into its own board/column, independently of the
            primary sheet above.
          </p>
        ) : (
          sources.map((source) => (
            <ImportSourceRow
              key={source.id}
              source={source}
              boards={boards}
              busy={updateSource.isPending || deleteSource.isPending}
              onToggleAuto={async (enabled) => {
                setError(null);
                try {
                  await updateSource.mutateAsync({ id: source.id, patch: { auto_import_new_leads: enabled } });
                } catch (err) {
                  setError(actionErrorMessage(err));
                }
              }}
              onRemove={async () => {
                setError(null);
                try {
                  await deleteSource.mutateAsync(source.id);
                } catch (err) {
                  setError(actionErrorMessage(err));
                }
              }}
            />
          ))
        )}
      </div>

      <AddImportSourceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workspaceId={workspaceId}
        spreadsheets={spreadsheetsQuery.data ?? []}
        saving={createSource.isPending}
        onCreate={async (input) => {
          setError(null);
          try {
            await createSource.mutateAsync(input);
            setModalOpen(false);
          } catch (err) {
            setError(actionErrorMessage(err));
          }
        }}
      />
    </div>
  );
}

function ExportSection({ workspaceId }: { workspaceId: string }) {
  const statusQuery = useGoogleSheetsStatusQuery(workspaceId);
  const integration = statusQuery.data?.integration ?? null;
  const createSheet = useCreateExportSheetMutation(workspaceId);
  const updateExportConfig = useUpdateExportConfigMutation(workspaceId);
  const exportBoard = useExportBoardMutation(workspaceId);
  const boardsQuery = useLeadsBoardsQuery(workspaceId, true);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<number | null>(null);

  const hasExportSheet = !!integration?.export_spreadsheet_id;
  const boards = boardsQuery.data ?? [];

  async function handleCreateSheet() {
    if (createSheet.isPending) return;
    setError(null);
    try {
      await createSheet.mutateAsync();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleAutoExportToggle(enabled: boolean) {
    setError(null);
    try {
      await updateExportConfig.mutateAsync({ auto_export_new_leads: enabled });
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleExportBoard() {
    if (!selectedBoardId || exportBoard.isPending) return;
    setError(null);
    setExportResult(null);
    try {
      const res = await exportBoard.mutateAsync(selectedBoardId);
      setExportResult(res.exported);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  return (
    <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
      <p className="text-sm font-semibold text-foreground">Lead export</p>
      <p className="mt-1 text-xs text-foreground/60">
        Does not import from sheets. Creates or links an export spreadsheet, writes lead rows from
        Operatora (full board sync or automatic append for new leads).
      </p>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button isDisabled={createSheet.isPending} onPress={handleCreateSheet}>
          {createSheet.isPending ? "Creating…" : "Create new export spreadsheet"}
        </Button>
        {integration?.export_spreadsheet_url ? (
          <a
            href={integration.export_spreadsheet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 text-sm font-medium text-foreground hover:bg-black/[0.02] dark:border-white/[0.12] dark:hover:bg-white/[0.04]"
          >
            <ArrowUpRightFromSquare className="size-4" aria-hidden="true" />
            Open export sheet
          </a>
        ) : null}
      </div>

      {hasExportSheet ? (
        <p className="mt-2 text-xs text-success">
          Export destination: tab <strong>{integration?.export_sheet_tab_name ?? "Leads Export"}</strong>
        </p>
      ) : (
        <p className="mt-2 text-xs text-foreground/60">Create a spreadsheet above to start exporting.</p>
      )}

      <label className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="text-foreground">Automatically append new leads to the export sheet</span>
          {!hasExportSheet ? <span className="mt-0.5 block text-xs text-foreground/50">Create an export spreadsheet first.</span> : null}
        </span>
        <Switch
          isSelected={!!integration?.auto_export_new_leads}
          isDisabled={!hasExportSheet || updateExportConfig.isPending}
          onChange={handleAutoExportToggle}
          aria-label="Auto-export new leads"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </label>

      {hasExportSheet ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-black/[0.06] pt-4 dark:border-white/[0.08]">
          <p className="text-sm font-medium text-foreground">Sync board to sheet</p>
          <p className="text-xs text-foreground/60">
            Replaces the export tab with headers plus all leads on the selected board.
          </p>
          {boards.length === 0 ? (
            <p className="text-xs text-foreground/60">No lead boards in this workspace.</p>
          ) : (
            <>
              <Select
                aria-label="Lead board"
                value={selectedBoardId}
                onChange={(key) => typeof key === "string" && setSelectedBoardId(key)}
              >
                <Label>Lead board</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={boards.map((b) => ({ id: b.id, label: b.name }))}>
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
              <div>
                <Button isDisabled={exportBoard.isPending || !selectedBoardId} onPress={handleExportBoard}>
                  {exportBoard.isPending ? "Exporting…" : "Export all leads on this board"}
                </Button>
              </div>
              {exportResult !== null ? (
                <p className="text-xs text-success">{exportResult} row(s) written to Google Sheets.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
