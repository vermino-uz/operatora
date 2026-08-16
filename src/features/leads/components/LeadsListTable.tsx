"use client";

import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight, Clock } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { RowCheckbox } from "@/features/leads/components/RowCheckbox";
import { formatLeadName, isLeadOverdue, type LeadRow } from "@/features/leads/types";
import type { LeadSelection } from "@/features/leads/hooks/useLeadSelection";
import type { Paginated } from "@/types/api";
import type { UseQueryResult } from "@tanstack/react-query";

export interface LeadsListTableProps {
  query: UseQueryResult<Paginated<LeadRow>>;
  onOpenLead: (lead: LeadRow) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Row multi-select (Phase 2c-3) — optional so this table stays usable
   * without wiring selection everywhere it's rendered. */
  selection?: LeadSelection;
}

/** Active tab's List (table) view — the same TanStack Table v9 headless
 * pattern `ConversationsTable` established (plain semantic `<table>`, no
 * `useReactTable`/`getCoreRowModel` — see that file's doc comment for the
 * v8-vs-v9 API note this project already worked through). Server-driven
 * 1-indexed pagination via `useLeadsListQuery`/`leadsApi.getLeadsList`
 * (`GET /leads-list`), distinct from the Kanban view's per-column
 * pagination. */
const EMPTY_ITEMS: LeadRow[] = [];
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, LeadRow>();
const columns = helper.columns([
  helper.display({
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{formatLeadName(row.original)}</p>
        {row.original.phone_number ? (
          <p className="truncate font-mono text-xs text-muted">{row.original.phone_number}</p>
        ) : null}
      </div>
    ),
  }),
  helper.display({
    id: "column",
    header: "Stage",
    cell: ({ row }) => <span className="text-sm text-foreground">{row.original.column?.name ?? "—"}</span>,
  }),
  helper.display({
    id: "operator",
    header: "Operator",
    cell: ({ row }) => <span className="text-sm text-foreground">{row.original.operators?.operator_name ?? "Unassigned"}</span>,
  }),
  helper.display({
    id: "deadline",
    header: "Deadline",
    cell: ({ row }) => {
      const deadline = row.original.deadline ? new Date(row.original.deadline) : null;
      if (!deadline) return <span className="text-sm text-muted">—</span>;
      const overdue = isLeadOverdue(row.original.deadline);
      return (
        <span className={`flex items-center gap-1 text-sm ${overdue ? "font-medium text-danger" : "text-foreground"}`}>
          <Clock className="size-3.5" aria-hidden="true" />
          {deadline.toLocaleDateString()}
        </span>
      );
    },
  }),
  helper.display({
    id: "created",
    header: "Created",
    cell: ({ row }) => <span className="text-sm text-foreground">{new Date(row.original.created_at).toLocaleDateString()}</span>,
  }),
]);

export function LeadsListTable({ query, onOpenLead, page, pageSize, onPageChange, selection }: LeadsListTableProps) {
  const items = query.data?.items ?? EMPTY_ITEMS;
  const total = query.data?.total ?? 0;
  const table = useTable({ features, columns, data: items });
  const visibleIds = items.map((l) => l.id);
  const allVisibleSelected = selection ? visibleIds.length > 0 && visibleIds.every((id) => selection.isSelected(id)) : false;
  const someVisibleSelected = selection ? visibleIds.some((id) => selection.isSelected(id)) : false;

  if (query.isLoading) return <LoadingState label="Loading leads…" className="flex-1" />;
  if (query.isError) {
    return (
      <div className="flex-1">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex-1">
        <EmptyState title="No leads found" description="Try adjusting your filters." />
      </div>
    );
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-divider">
                {selection ? (
                  <th className="w-10 px-4 py-2">
                    <RowCheckbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected && !allVisibleSelected}
                      onChange={() => selection.toggleAll(visibleIds)}
                      label="Select all leads on this page"
                    />
                  </th>
                ) : null}
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onOpenLead(row.original)}
                className="cursor-pointer border-b border-divider/60 transition-colors hover:bg-[var(--default)]"
              >
                {selection ? (
                  <td className="px-4 py-3 align-top">
                    <RowCheckbox
                      checked={selection.isSelected(row.original.id)}
                      onChange={() => selection.toggle(row.original.id)}
                      label={`Select ${formatLeadName(row.original)}`}
                    />
                  </td>
                ) : null}
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-top">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-divider px-4 py-3">
        <p className="text-xs text-muted">{total === 0 ? "0 results" : `${from}–${to} of ${total}`}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" isDisabled={page <= 1} onPress={() => onPageChange(Math.max(1, page - 1))}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            Prev
          </Button>
          <Button size="sm" variant="secondary" isDisabled={page * pageSize >= total} onPress={() => onPageChange(page + 1)}>
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
