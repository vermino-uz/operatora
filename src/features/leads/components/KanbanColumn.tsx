"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Button, Chip } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { COLUMN_PAGE_SIZE, useColumnLeadsQuery } from "@/features/leads/hooks/useColumnLeadsQuery";
import { useColumnLeadSignalsQuery } from "@/features/leads/hooks/useColumnLeadSignalsQuery";
import { LeadCard } from "@/features/leads/components/LeadCard";
import type { LeadBoardColumn, LeadFilters, LeadRow } from "@/features/leads/types";
import type { LeadSelection } from "@/features/leads/hooks/useLeadSelection";

/** One pipeline column — droppable target for DnD, own paginated fetch
 * (`GET /lead-board/:boardId/column/:columnId`, numbered Prev/Next — see
 * `useColumnLeadsQuery`'s doc comment for why not infinite scroll).
 *
 * `sortByAiScore` (Phase 2c-11) re-orders the *currently loaded page only*
 * by real `buying_intent_score` (desc, unscored leads last) — there is no
 * server-side sort param on this endpoint and `lead_signals` isn't joined
 * into its response (confirmed by reading `lead-board.controller.ts`'s
 * `buildFilters()`/`lead-board.service.ts`'s column-leads query directly),
 * so a true cross-page global sort isn't possible without a new backend
 * endpoint — out of scope for this pass. Signals are only fetched (one
 * batched request per page, not per card) while the toggle is on, so
 * leaving it off costs nothing extra. */
export function KanbanColumn({
  boardId,
  column,
  count,
  filters,
  onOpenLead,
  selection,
  sortByAiScore,
}: {
  boardId: string;
  column: LeadBoardColumn;
  count: number;
  filters: LeadFilters;
  onOpenLead: (lead: LeadRow) => void;
  selection?: LeadSelection;
  sortByAiScore?: boolean;
}) {
  const [page, setPage] = useState(1);
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { columnId: column.id } });
  const query = useColumnLeadsQuery(boardId, column.id, page, filters);
  const leadIds = query.data?.items.map((l) => l.id) ?? [];
  const signalsQuery = useColumnLeadSignalsQuery(leadIds, Boolean(sortByAiScore));
  const scoreByLeadId = new Map((signalsQuery.data ?? []).map((s) => [s.lead_id, s.buying_intent_score]));

  const displayedLeads = query.data?.items ?? [];
  const sortedLeads = sortByAiScore
    ? [...displayedLeads].sort((a, b) => {
        const scoreA = scoreByLeadId.get(a.id);
        const scoreB = scoreByLeadId.get(b.id);
        if (scoreA == null && scoreB == null) return 0;
        if (scoreA == null) return 1;
        if (scoreB == null) return -1;
        return scoreB - scoreA;
      })
    : displayedLeads;

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / COLUMN_PAGE_SIZE)) : 1;
  // WIP limit (Phase 2c-5) — `lead_limit` is `null`/undefined for an
  // unlimited column. "At limit" and "over limit" both warn (a column can
  // end up over its limit if the limit was lowered after leads were already
  // in it — the backend doesn't retroactively evict anything).
  const hasLimit = column.lead_limit != null;
  const atOrOverLimit = hasLimit && count >= (column.lead_limit as number);

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[300px] shrink-0 flex-col rounded-xl border ${
        isOver
          ? "border-primary bg-primary/5"
          : atOrOverLimit
            ? "border-warning/40"
            : "border-black/[0.08] dark:border-white/[0.12]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-black/[0.08] px-3 py-2.5 dark:border-white/[0.12]">
        <div className="flex min-w-0 items-center gap-2">
          {column.color ? (
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} aria-hidden="true" />
          ) : null}
          <p className="truncate text-sm font-semibold text-foreground">{column.name}</p>
        </div>
        <Chip
          size="sm"
          variant="soft"
          color={atOrOverLimit ? "warning" : undefined}
          className="shrink-0"
          title={hasLimit ? `WIP limit: ${column.lead_limit}` : undefined}
        >
          {hasLimit ? `${count}/${column.lead_limit}` : count}
        </Chip>
      </div>

      <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2">
        {query.isLoading ? (
          <LoadingState label="Loading leads…" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : sortedLeads.length > 0 ? (
          sortedLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onOpen={onOpenLead}
              selected={selection?.isSelected(lead.id)}
              onToggleSelect={selection ? () => selection.toggle(lead.id) : undefined}
              aiScore={sortByAiScore ? (scoreByLeadId.get(lead.id) ?? null) : undefined}
            />
          ))
        ) : (
          <p className="py-6 text-center text-xs text-foreground/40">No leads</p>
        )}
      </div>

      {query.data && query.data.total > COLUMN_PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-2 border-t border-black/[0.08] px-2 py-1.5 dark:border-white/[0.12]">
          <Button
            size="sm"
            variant="secondary"
            isDisabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </Button>
          <span className="text-xs text-foreground/50">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={page >= totalPages}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
