"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, ListBox, Select } from "@heroui/react";
import {
  ArrowDownToSquare,
  ArrowRotateRight,
  ArrowUpFromSquare,
  CircleLink,
  CodeMerge,
  BarsDescendingAlignLeftArrowDown,
  Envelope,
  Eye,
  Funnel,
  GearPlay,
  LayoutColumns,
  ListCheck,
  MagicWand,
  Plus,
  Thunderbolt,
} from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { hasAnyRole, MANAGER_ROLES } from "@/auth/permissions";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useLeadsBoardsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import { useLeadBoardQuery } from "@/features/leads/hooks/useLeadBoardQuery";
import { useLeadsListQuery, LEADS_LIST_PAGE_SIZE } from "@/features/leads/hooks/useLeadsListQuery";
import { useTeamMembersQuery } from "@/features/team/hooks/useTeamMembersQuery";
import { KanbanBoard } from "@/features/leads/components/KanbanBoard";
import { CreateLeadDialog } from "@/features/leads/components/CreateLeadDialog";
import { LeadDetailsModal } from "@/features/leads/components/LeadDetailsModal";
import { LeadFiltersBar } from "@/features/leads/components/LeadFiltersBar";
import { LeadsTabs } from "@/features/leads/components/LeadsTabs";
import { LeadViewToggle } from "@/features/leads/components/LeadViewToggle";
import { LeadsListTable } from "@/features/leads/components/LeadsListTable";
import { SoldLeadsTable } from "@/features/leads/components/SoldLeadsTable";
import { RejectedLeadsTable } from "@/features/leads/components/RejectedLeadsTable";
import { ArchivedLeadsTable } from "@/features/leads/components/ArchivedLeadsTable";
import { TrashLeadsTable } from "@/features/leads/components/TrashLeadsTable";
import { BulkActionsBar } from "@/features/leads/components/BulkActionsBar";
import { FilteredBulkActionsDialog } from "@/features/leads/components/FilteredBulkActionsDialog";
import { DuplicateLeadsDialog } from "@/features/leads/components/DuplicateLeadsDialog";
import { ManageColumnsDialog } from "@/features/leads/components/ManageColumnsDialog";
import { ManageCustomFieldsDialog } from "@/features/leads/components/ManageCustomFieldsDialog";
import { LeadFieldVisibilityManager } from "@/features/leads/components/LeadFieldVisibilityManager";
import { CreateBoardDialog } from "@/features/leads/components/CreateBoardDialog";
import { ShareBoardDialog } from "@/features/leads/components/ShareBoardDialog";
import { SmsTemplatesManager } from "@/features/leads/components/SmsTemplatesManager";
import { BulkComposeSmsDialog } from "@/features/leads/components/BulkComposeSmsDialog";
import { LeadsExportDialog } from "@/features/leads/components/LeadsExportDialog";
import { LeadsImportDialog } from "@/features/leads/components/LeadsImportDialog";
import { LeadBoardAutomationsDialog } from "@/features/leads/components/LeadBoardAutomationsDialog";
import { AiLeadDistributionDialog } from "@/features/leads/components/AiLeadDistributionDialog";
import { useLeadSelection } from "@/features/leads/hooks/useLeadSelection";
import { subscribeToLeadBoardUpdates } from "@/services/realtime/subscriptions";
import { countActiveLeadFilters, EMPTY_LEAD_FILTERS, type LeadRow, type LeadTab, type LeadViewMode } from "@/features/leads/types";

/**
 * Leads Kanban board — core MVP scope (see PROGRESS.md for the full
 * feature brief, trace, and deferred-scope list). No create-lead, no bulk
 * operations, no sold/rejected/archived/trash views — board + columns,
 * drag-and-drop move, realtime, filtering, and a scoped-down details view.
 *
 * Board switcher: only rendered when the workspace actually has more than
 * one board (most workspaces have exactly one, seeded on signup) — decided
 * from `GET /boards`'s own list rather than over-building a switcher UI no
 * workspace in practice needs.
 */
export default function LeadsPage() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const queryClient = useQueryClient();
  const boardsQuery = useLeadsBoardsQuery(workspaceId, Boolean(workspaceId));
  const operatorsQuery = useTeamMembersQuery(workspaceId, {});
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [openLead, setOpenLead] = useState<LeadRow | null>(null);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_LEAD_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadTab>("active");
  const [viewMode, setViewMode] = useState<LeadViewMode>("board");
  const [listPage, setListPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(0);
  const [archivedPage, setArchivedPage] = useState(0);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [duplicateLeadsOpen, setDuplicateLeadsOpen] = useState(false);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [manageFieldsOpen, setManageFieldsOpen] = useState(false);
  const [fieldVisibilityOpen, setFieldVisibilityOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [shareBoardOpen, setShareBoardOpen] = useState(false);
  const [smsTemplatesOpen, setSmsTemplatesOpen] = useState(false);
  const [composeBulkSmsOpen, setComposeBulkSmsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [aiDistributionOpen, setAiDistributionOpen] = useState(false);
  // Board-view sort-by-AI-score toggle (Phase 2c-11) — client-side only,
  // scoped to the currently-loaded page of each column (see
  // `KanbanColumn`'s doc comment for why: `GET /lead-board/:boardId/column/
  // :columnId` has no server-side sort param, and `lead_signals` isn't
  // joined into that response, so a true cross-page global sort isn't
  // possible without a new backend endpoint — out of scope here).
  const [sortByAiScore, setSortByAiScore] = useState(false);
  const roles = useSessionStore((s) => s.roles);
  const canBulkSms = hasAnyRole(roles, MANAGER_ROLES);
  // AI lead distribution is gated server-side to workspace owners/admins
  // (`isWorkspaceOwnerOrAdmin`, a `workspace_users`-role check this app
  // doesn't fetch client-side yet). `MANAGER_ROLES` (the global JWT roles
  // group) is the closest available approximation for hiding the entry
  // point — same "hidden UI is a UX courtesy, the backend remains the
  // authorization boundary" precedent as every other role-gated button
  // here; a non-owner admin-role caller who still gets a 403 sees it via
  // the dialog's own error banner, not a silent failure.
  const canDistributeLeads = hasAnyRole(roles, MANAGER_ROLES);
  // Shared between the Active tab's Kanban and List views — one selection
  // survives a view-mode toggle (see `useLeadSelection`'s doc comment).
  const selection = useLeadSelection();

  const boards = boardsQuery.data ?? [];
  const boardId = selectedBoardId ?? boards[0]?.id ?? null;
  const activeFilterCount = countActiveLeadFilters(filters);

  // Reset every tab's own page back to its first page (and clear the Active
  // tab's row selection, which stops making sense once the underlying data
  // changes) whenever the board, filters, or tab change — render-time
  // "adjust state on prop change" (React's own documented pattern, already
  // established in this codebase by `useConversationAudio`) rather than a
  // `useEffect`, so it doesn't cost an extra render via a synchronous
  // setState-in-effect.
  const [trackedPageResetKey, setTrackedPageResetKey] = useState<string>("");
  const pageResetKey = `${boardId ?? ""}|${JSON.stringify(filters)}|${activeTab}`;
  if (pageResetKey !== trackedPageResetKey) {
    setTrackedPageResetKey(pageResetKey);
    setListPage(1);
    setRejectedPage(0);
    setArchivedPage(0);
    selection.clear();
  }

  const boardDataQuery = useLeadBoardQuery(boardId, filters);
  const visibleColumns = useMemo(
    () => (boardDataQuery.data?.columns ?? []).filter((c) => !c.is_hidden),
    [boardDataQuery.data],
  );
  const listColumnIds = useMemo(() => visibleColumns.map((c) => c.id), [visibleColumns]);
  const leadsListQuery = useLeadsListQuery(
    activeTab === "active" && viewMode === "list" ? boardId : null,
    listPage,
    filters,
    listColumnIds,
  );
  const operatorOptions = (operatorsQuery.data ?? []).map((op) => ({
    id: op.user_id,
    label: op.full_name || op.email || op.user_id,
  }));

  useEffect(() => {
    if (!workspaceId || !boardId) return;
    return subscribeToLeadBoardUpdates(queryClient, workspaceId, boardId);
  }, [queryClient, workspaceId, boardId]);

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="No workspace selected" description="Sign in to a workspace to view leads." />
      </div>
    );
  }

  if (boardsQuery.isLoading) return <LoadingState label="Loading boards…" />;
  if (boardsQuery.isError) return <ErrorState error={boardsQuery.error} onRetry={() => boardsQuery.refetch()} />;
  if (!boardId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="No leads board yet" description="This workspace has no leads board configured." />
      </div>
    );
  }

  // Filters are wired against real backend params on Active/Rejected/
  // Archived only — Sold and Trash accept no `filters`/`search` param at
  // all (traced directly in their controllers, see `leadsApi`'s doc
  // comments), so the filter toggle/bar don't render for those two tabs
  // rather than offering a filter UI that would silently do nothing.
  const filtersSupported = activeTab === "active" || activeTab === "rejected" || activeTab === "archived";

  return (
    <div className="-m-3 flex h-[calc(100%+1.5rem)] min-h-0 flex-col overflow-hidden md:-m-6 md:h-[calc(100%+3rem)]">
      <div className="flex flex-col gap-2 border-b border-black/[0.08] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3 dark:border-white/[0.12]">
        <h1 className="text-lg font-semibold text-foreground">Leads</h1>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5">
          <Select
            aria-label="Board"
            value={boardId}
            onChange={(key) => {
              if (typeof key === "string") setSelectedBoardId(key);
            }}
            className="w-[min(100%,9rem)] shrink-0 sm:w-56"
          >
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

          <IconButton
            label="New board"
            tooltip="New board"
            variant="ghost"
            size="sm"
            onPress={() => setCreateBoardOpen(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            label="Share board"
            tooltip="Share board"
            variant="ghost"
            size="sm"
            onPress={() => setShareBoardOpen(true)}
          >
            <CircleLink className="size-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            label="Refresh board"
            tooltip="Refresh"
            variant="ghost"
            size="sm"
            isDisabled={boardDataQuery.isFetching}
            onPress={() => void boardDataQuery.refetch()}
          >
            <ArrowRotateRight className="size-4" aria-hidden="true" />
          </IconButton>

          {filtersSupported ? (
            <Badge.Anchor>
              <IconButton
                label="Filter leads"
                tooltip={filtersOpen ? "Hide filters" : "Filters"}
                variant={filtersOpen ? "secondary" : "ghost"}
                size="sm"
                onPress={() => setFiltersOpen((v) => !v)}
              >
                <Funnel className="size-4" aria-hidden="true" />
              </IconButton>
              {activeFilterCount > 0 ? (
                <Badge color="accent" size="sm">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </Badge.Anchor>
          ) : null}

          {activeTab === "active" ? (
            <>
              <LeadViewToggle value={viewMode} onChange={setViewMode} />

              <IconButton
                label="Manage columns"
                tooltip="Manage columns"
                variant="ghost"
                size="sm"
                onPress={() => setManageColumnsOpen(true)}
              >
                <LayoutColumns className="size-4" aria-hidden="true" />
              </IconButton>

              <IconButton
                label="Manage custom fields"
                tooltip="Manage custom fields"
                variant="ghost"
                size="sm"
                onPress={() => setManageFieldsOpen(true)}
              >
                <ListCheck className="size-4" aria-hidden="true" />
              </IconButton>

              <IconButton
                label="Field visibility"
                tooltip="Field visibility"
                variant="ghost"
                size="sm"
                onPress={() => setFieldVisibilityOpen(true)}
              >
                <Eye className="size-4" aria-hidden="true" />
              </IconButton>

              <IconButton
                label="Board automations"
                tooltip="Automations"
                variant="ghost"
                size="sm"
                onPress={() => setAutomationsOpen(true)}
              >
                <GearPlay className="size-4" aria-hidden="true" />
              </IconButton>

              {viewMode === "board" ? (
                <IconButton
                  label="Sort by AI score"
                  tooltip={sortByAiScore ? "Sorting by AI score (this page only)" : "Sort by AI score"}
                  variant={sortByAiScore ? "secondary" : "ghost"}
                  size="sm"
                  onPress={() => setSortByAiScore((v) => !v)}
                >
                  <BarsDescendingAlignLeftArrowDown className="size-4" aria-hidden="true" />
                </IconButton>
              ) : null}

              {canDistributeLeads ? (
                <IconButton
                  label="AI lead distribution"
                  tooltip="AI lead distribution"
                  variant="ghost"
                  size="sm"
                  onPress={() => setAiDistributionOpen(true)}
                >
                  <MagicWand className="size-4 text-primary" aria-hidden="true" />
                </IconButton>
              ) : null}

              <IconButton
                label="Bulk actions on filtered leads"
                tooltip="Bulk actions (filtered)"
                variant="ghost"
                size="sm"
                onPress={() => setBulkActionsOpen(true)}
              >
                <Thunderbolt className="size-4" aria-hidden="true" />
              </IconButton>

              <IconButton
                label="Find duplicate leads"
                tooltip="Duplicate leads"
                variant="ghost"
                size="sm"
                onPress={() => setDuplicateLeadsOpen(true)}
              >
                <CodeMerge className="size-4" aria-hidden="true" />
              </IconButton>

              <IconButton
                label="SMS templates"
                tooltip="SMS templates"
                variant="ghost"
                size="sm"
                onPress={() => setSmsTemplatesOpen(true)}
              >
                <Envelope className="size-4" aria-hidden="true" />
              </IconButton>

              <IconButton
                label="Import leads"
                tooltip="Import (CSV/Excel)"
                variant="ghost"
                size="sm"
                onPress={() => setImportOpen(true)}
              >
                <ArrowUpFromSquare className="size-4" aria-hidden="true" />
              </IconButton>

              <IconButton
                label="Export leads"
                tooltip="Export (CSV)"
                variant="ghost"
                size="sm"
                onPress={() => setExportOpen(true)}
              >
                <ArrowDownToSquare className="size-4" aria-hidden="true" />
              </IconButton>

              {canBulkSms ? (
                <IconButton
                  label="Compose SMS"
                  tooltip="Compose SMS (bulk)"
                  variant="ghost"
                  size="sm"
                  onPress={() => setComposeBulkSmsOpen(true)}
                >
                  <Envelope className="size-4 text-primary" aria-hidden="true" />
                </IconButton>
              ) : null}

              <IconButton label="Add lead" tooltip="Add lead" variant="secondary" size="sm" onPress={() => setCreateLeadOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
              </IconButton>
            </>
          ) : null}
        </div>
      </div>

      <LeadsTabs value={activeTab} onChange={setActiveTab} />

      {filtersOpen && filtersSupported ? (
        <LeadFiltersBar filters={filters} onChange={setFilters} operators={operatorOptions} />
      ) : null}

      {activeTab === "active" && selection.count > 0 ? (
        <BulkActionsBar boardId={boardId} selection={selection} columns={visibleColumns} operators={operatorOptions} />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        {activeTab === "active" && viewMode === "list" ? (
          <LeadsListTable
            query={leadsListQuery}
            onOpenLead={setOpenLead}
            page={listPage}
            pageSize={LEADS_LIST_PAGE_SIZE}
            onPageChange={setListPage}
            selection={selection}
          />
        ) : activeTab === "active" ? (
          boardDataQuery.isLoading ? (
            <LoadingState label="Loading board…" />
          ) : boardDataQuery.isError ? (
            <ErrorState error={boardDataQuery.error} onRetry={() => boardDataQuery.refetch()} />
          ) : visibleColumns.length === 0 ? (
            <EmptyState title="No columns yet" description="This board has no pipeline columns configured." />
          ) : (
            <KanbanBoard
              boardId={boardId}
              columns={visibleColumns}
              counts={boardDataQuery.data?.counts ?? {}}
              filters={filters}
              onOpenLead={setOpenLead}
              selection={selection}
              sortByAiScore={sortByAiScore}
            />
          )
        ) : activeTab === "sold" ? (
          <SoldLeadsTable boardId={boardId} onOpenLead={setOpenLead} />
        ) : activeTab === "rejected" ? (
          <RejectedLeadsTable boardId={boardId} filters={filters} page={rejectedPage} onPageChange={setRejectedPage} onOpenLead={setOpenLead} />
        ) : activeTab === "archived" ? (
          <ArchivedLeadsTable boardId={boardId} filters={filters} page={archivedPage} onPageChange={setArchivedPage} onOpenLead={setOpenLead} />
        ) : (
          <TrashLeadsTable workspaceId={workspaceId} />
        )}
      </div>

      {openLead ? (
        <LeadDetailsModal boardId={boardId} columns={visibleColumns} initialLead={openLead} onClose={() => setOpenLead(null)} />
      ) : null}

      {createLeadOpen ? (
        <CreateLeadDialog boardId={boardId} workspaceId={workspaceId} onClose={() => setCreateLeadOpen(false)} />
      ) : null}

      {bulkActionsOpen ? (
        <FilteredBulkActionsDialog
          boardId={boardId}
          workspaceId={workspaceId}
          filters={filters}
          columns={visibleColumns}
          operators={operatorOptions}
          onClose={() => setBulkActionsOpen(false)}
        />
      ) : null}

      {duplicateLeadsOpen ? <DuplicateLeadsDialog boardId={boardId} onClose={() => setDuplicateLeadsOpen(false)} /> : null}

      {manageColumnsOpen ? <ManageColumnsDialog boardId={boardId} onClose={() => setManageColumnsOpen(false)} /> : null}

      {manageFieldsOpen ? <ManageCustomFieldsDialog boardId={boardId} onClose={() => setManageFieldsOpen(false)} /> : null}

      {fieldVisibilityOpen ? <LeadFieldVisibilityManager onClose={() => setFieldVisibilityOpen(false)} /> : null}

      {createBoardOpen ? (
        <CreateBoardDialog
          workspaceId={workspaceId}
          onClose={() => setCreateBoardOpen(false)}
          onCreated={(newBoardId) => {
            setSelectedBoardId(newBoardId);
            setCreateBoardOpen(false);
          }}
        />
      ) : null}

      {shareBoardOpen ? <ShareBoardDialog boardId={boardId} onClose={() => setShareBoardOpen(false)} /> : null}

      {smsTemplatesOpen ? <SmsTemplatesManager onClose={() => setSmsTemplatesOpen(false)} /> : null}

      {composeBulkSmsOpen && canBulkSms ? (
        <BulkComposeSmsDialog boardId={boardId} columns={visibleColumns} onClose={() => setComposeBulkSmsOpen(false)} />
      ) : null}

      {exportOpen ? (
        <LeadsExportDialog boardId={boardId} columns={visibleColumns} filters={filters} onClose={() => setExportOpen(false)} />
      ) : null}

      {importOpen ? (
        <LeadsImportDialog boardId={boardId} workspaceId={workspaceId} operators={operatorOptions} onClose={() => setImportOpen(false)} />
      ) : null}

      {automationsOpen ? <LeadBoardAutomationsDialog boardId={boardId} onClose={() => setAutomationsOpen(false)} /> : null}

      {aiDistributionOpen && canDistributeLeads ? (
        <AiLeadDistributionDialog boardId={boardId} onClose={() => setAiDistributionOpen(false)} />
      ) : null}
    </div>
  );
}
