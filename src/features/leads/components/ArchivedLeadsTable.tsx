"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Archive, ArrowRotateLeft, ChevronLeft, ChevronRight } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { RowCheckbox } from "@/features/leads/components/RowCheckbox";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { formatLeadName, type LeadFilters, type LeadRow } from "@/features/leads/types";
import { useLeadSelection } from "@/features/leads/hooks/useLeadSelection";
import {
  ARCHIVED_PAGE_SIZE,
  useArchivedLeadsQuery,
  useBulkRestoreArchivedLeadsMutation,
  useRestoreArchivedLeadMutation,
} from "@/features/leads/hooks/useArchivedLeads";

/** Archived tab — 0-indexed server-side pagination (fixed 100/page), see
 * `archivedLeadsApi.list`'s doc comment. Row selection + bulk restore
 * (Phase 2c-3) via the real `restore-multiple` endpoint — bulk *archive*
 * doesn't apply here (these leads are already archived); bulk permanent
 * delete isn't offered from this tab either, matching the old frontend
 * (archived leads go back to Trash via the regular delete action first). */
export function ArchivedLeadsTable({
  boardId,
  filters,
  page,
  onPageChange,
  onOpenLead,
}: {
  boardId: string;
  filters: LeadFilters;
  page: number;
  onPageChange: (page: number) => void;
  onOpenLead: (lead: LeadRow) => void;
}) {
  const query = useArchivedLeadsQuery(boardId, page, filters);
  const restore = useRestoreArchivedLeadMutation(boardId);
  const bulkRestore = useBulkRestoreArchivedLeadsMutation(boardId);
  const selection = useLeadSelection();
  const [bulkError, setBulkError] = useState<string | null>(null);

  if (query.isLoading) return <LoadingState label="Loading archived leads…" className="flex-1" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  if (items.length === 0) {
    return <EmptyState title="No archived leads" description="Archived leads will show up here." />;
  }

  const from = page * ARCHIVED_PAGE_SIZE + 1;
  const to = Math.min((page + 1) * ARCHIVED_PAGE_SIZE, total);
  const visibleIds = items.map((l) => l.id);
  const allVisibleSelected = visibleIds.every((id) => selection.isSelected(id));
  const someVisibleSelected = visibleIds.some((id) => selection.isSelected(id));

  async function handleBulkRestore() {
    if (bulkRestore.isPending) return; // guard double-submit
    setBulkError(null);
    try {
      await bulkRestore.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setBulkError(leadActionErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      {selection.count > 0 ? (
        <div className="flex flex-col gap-1.5 border-b border-divider bg-[var(--default)] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{selection.count} selected</span>
            <Button size="sm" variant="secondary" isDisabled={bulkRestore.isPending} onPress={() => void handleBulkRestore()}>
              <ArrowRotateLeft className="size-3.5" aria-hidden="true" />
              Restore selected
            </Button>
            <Button size="sm" variant="ghost" isDisabled={bulkRestore.isPending} onPress={() => selection.clear()}>
              Clear
            </Button>
          </div>
          {bulkError ? (
            <p role="alert" className="text-xs text-danger">
              {bulkError}
            </p>
          ) : null}
        </div>
      ) : null}

      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b border-divider">
            <th className="w-10 px-4 py-2">
              <RowCheckbox
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected && !allVisibleSelected}
                onChange={() => selection.toggleAll(visibleIds)}
                label="Select all archived leads on this page"
              />
            </th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Name</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Stage</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Archived at</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Archived by</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Note</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((lead) => (
            <tr key={lead.id} className="border-b border-divider/60 hover:bg-[var(--default)]">
              <td className="px-4 py-3 align-top">
                <RowCheckbox
                  checked={selection.isSelected(lead.id)}
                  onChange={() => selection.toggle(lead.id)}
                  label={`Select ${formatLeadName(lead)}`}
                />
              </td>
              <td className="cursor-pointer px-4 py-3 align-top" onClick={() => onOpenLead(lead)}>
                <p className="text-sm font-medium text-foreground">{formatLeadName(lead)}</p>
                {lead.phone_number ? <p className="font-mono text-xs text-muted">{lead.phone_number}</p> : null}
              </td>
              <td className="px-4 py-3 align-top text-sm text-foreground">{lead.column?.name ?? "—"}</td>
              <td className="px-4 py-3 align-top text-sm text-foreground">
                {lead.archived_at ? new Date(lead.archived_at).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3 align-top text-sm text-foreground">
                {lead.archived_by_profile?.full_name || lead.archived_by_profile?.email || "—"}
              </td>
              <td className="max-w-[220px] truncate px-4 py-3 align-top text-sm text-foreground" title={lead.archived_note ?? ""}>
                {lead.archived_note || "—"}
              </td>
              <td className="px-4 py-3 align-top">
                <Button size="sm" variant="secondary" isDisabled={restore.isPending} onPress={() => restore.mutate(lead.id)}>
                  <ArrowRotateLeft className="size-3.5" aria-hidden="true" />
                  Restore
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Archive className="size-3.5" aria-hidden="true" />
          {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" isDisabled={page <= 0} onPress={() => onPageChange(Math.max(0, page - 1))}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            Prev
          </Button>
          <Button size="sm" variant="secondary" isDisabled={to >= total} onPress={() => onPageChange(page + 1)}>
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
