"use client";

import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Button, Chip } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Conversation } from "@/features/conversations/types";
import type { Paginated } from "@/types/api";
import type { UseQueryResult } from "@tanstack/react-query";

export interface ConversationsTableProps {
  query: UseQueryResult<Paginated<Conversation>>;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  offset: number;
  limit: number;
  onOffsetChange: (offset: number) => void;
}

function statusColor(status: string | null | undefined): "success" | "warning" | "danger" | "default" {
  switch ((status ?? "").toLowerCase()) {
    case "analyzed":
    case "completed":
      return "success";
    case "processing":
    case "new":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "default";
  }
}

function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-muted";
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-danger";
}

/** Server-driven pagination via TanStack Table v9's headless model (first
 * feature in this project to use it — see ARCHITECTURE.md's stack
 * decision). v9's API is a significant break from the widely-known v8
 * shape: no `getCoreRowModel()` option, no `useReactTable` — instead
 * `useTable({ features, columns, data })` plus `table.FlexRender` (see
 * `node_modules/@tanstack/react-table/skills/getting-started/SKILL.md`).
 * Sort is fixed server-side (`created_at DESC`, no sortable-column param
 * exists), so no column-sort feature/UI is registered here. Rendered as a
 * plain semantic `<table>` rather than HeroUI's `Table` (a
 * react-aria-components collection/render-prop model, a different
 * composition system to the headless row/column model above) to keep
 * TanStack Table's row model as the single source of truth. */
const EMPTY_ITEMS: Conversation[] = [];

// Static inputs kept at module scope per the v9 guidance (stable
// references so row/column models aren't invalidated every render). No
// optional feature plugins are registered — only the automatic core row
// model is needed (no client-side sort/filter/pagination; that's all
// server-driven via the `offset`/`limit` params above).
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, Conversation>();
const columns = helper.columns([
  helper.display({
    id: "client",
    header: "Client",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{row.original.client_name || "Unknown"}</p>
        {row.original.client_phone ? (
          <p className="truncate text-xs text-muted">{row.original.client_phone}</p>
        ) : null}
      </div>
    ),
  }),
  helper.display({
    id: "operator",
    header: "Operator",
    cell: ({ row }) => <span className="text-sm text-foreground">{row.original.operator_name || "—"}</span>,
  }),
  helper.display({
    id: "date",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-sm text-foreground">
        <p>{row.original.conversation_date || "—"}</p>
        <p className="text-xs text-muted">{row.original.conversation_time || ""}</p>
      </div>
    ),
  }),
  helper.display({
    id: "duration",
    header: "Duration",
    cell: ({ row }) => <span className="text-sm text-foreground">{row.original.duration || "—"}</span>,
  }),
  helper.display({
    id: "score",
    header: "Score",
    cell: ({ row }) => (
      <span className={`text-sm font-semibold ${scoreColor(row.original.ai_score)}`}>
        {row.original.ai_score ?? "—"}
      </span>
    ),
  }),
  helper.display({
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <Chip size="sm" color={statusColor(row.original.status)}>
        {row.original.status || "unknown"}
      </Chip>
    ),
  }),
  helper.display({
    id: "sentiment",
    header: "Sentiment",
    cell: ({ row }) => <span className="text-sm capitalize text-foreground">{row.original.sentiment || "—"}</span>,
  }),
  helper.display({
    id: "source",
    header: "Source",
    cell: ({ row }) => <span className="text-sm capitalize text-foreground">{row.original.source || "—"}</span>,
  }),
]);

export function ConversationsTable({
  query,
  selectedId,
  onSelect,
  offset,
  limit,
  onOffsetChange,
}: ConversationsTableProps) {
  const items = query.data?.items ?? EMPTY_ITEMS;
  const total = query.data?.total ?? 0;

  const table = useTable({ features, columns, data: items });

  if (query.isLoading) {
    return <LoadingState label="Loading conversations…" className="flex-1" />;
  }

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
        <EmptyState
          title="No conversations found"
          description="Try adjusting your filters or search terms."
        />
      </div>
    );
  }

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-divider">
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
                onClick={() => onSelect(row.original)}
                data-testid={`conversation-row-${row.original.id}`}
                className={`cursor-pointer border-b border-divider/60 transition-colors hover:bg-[var(--default)] ${
                  row.original.id === selectedId ? "bg-[var(--default)]" : ""
                }`}
              >
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
        <p className="text-xs text-muted">
          {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            isDisabled={offset === 0}
            onPress={() => onOffsetChange(Math.max(0, offset - limit))}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Prev
          </Button>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={offset + limit >= total}
            onPress={() => onOffsetChange(offset + limit)}
          >
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
