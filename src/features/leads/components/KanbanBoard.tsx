"use client";

import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { Xmark } from "@gravity-ui/icons";

import { KanbanColumn } from "@/features/leads/components/KanbanColumn";
import { useMoveLeadMutation } from "@/features/leads/hooks/useLeadMutations";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { formatLeadName, type LeadBoardColumn, type LeadFilters, type LeadRow } from "@/features/leads/types";
import type { LeadSelection } from "@/features/leads/hooks/useLeadSelection";

/**
 * Horizontal kanban board — `@dnd-kit/core` (not `@dnd-kit/sortable`): the
 * old frontend's `LeadBoard.tsx`/`LeadColumn.tsx`/`LeadCard.tsx` only ever
 * use `DndContext`/`useDraggable`/`useDroppable` from `core` (confirmed via
 * grep — `sortable` isn't imported anywhere in the leads feature), because
 * cards don't reorder within a column, they only move between columns.
 * `sortable` would add API surface this feature never needs.
 */
export function KanbanBoard({
  boardId,
  columns,
  counts,
  filters,
  onOpenLead,
  selection,
  sortByAiScore,
}: {
  boardId: string;
  columns: LeadBoardColumn[];
  counts: Record<string, number>;
  filters: LeadFilters;
  onOpenLead: (lead: LeadRow) => void;
  selection?: LeadSelection;
  sortByAiScore?: boolean;
}) {
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  // Drag-and-drop moves previously rolled back silently on failure with no
  // visible message at all (the mutation's own `onError` only restores the
  // cache snapshot) — this dismissible banner is the "upgrade the generic
  // rollback" the brief asked for; see `leadActionErrorMessage`'s "move"
  // context doc comment for why it's a clear, honest generic message rather
  // than a field-level guided dialog for this specific endpoint.
  const [dragError, setDragError] = useState<string | null>(null);
  const moveLead = useMoveLeadMutation(boardId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(event: DragStartEvent) {
    setDragError(null);
    const lead = event.active.data.current?.lead as LeadRow | undefined;
    setActiveLead(lead ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const targetColumnId = over.id as string;
    const lead = active.data.current?.lead as LeadRow | undefined;
    if (!lead || lead.column_id === targetColumnId) return;
    moveLead.mutate(
      { leadId: lead.id, columnId: targetColumnId },
      { onError: (err) => setDragError(leadActionErrorMessage(err, "move")) },
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveLead(null)}
    >
      {dragError ? (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <p>{dragError}</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDragError(null)}
            className="shrink-0 text-danger/70 hover:text-danger"
          >
            <Xmark className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto p-1">
        {columns.map((column) => (
          <KanbanColumn
            // Remounting on a filter change resets each column's internal
            // page state back to 1 — simpler and safer than threading a
            // page-reset effect through every column for what's already an
            // infrequent, user-initiated action (Apply/Clear filters).
            key={`${column.id}:${JSON.stringify(filters)}`}
            boardId={boardId}
            column={column}
            count={counts[column.id] ?? 0}
            filters={filters}
            onOpenLead={onOpenLead}
            selection={selection}
            sortByAiScore={sortByAiScore}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div className="w-[280px] rotate-1 select-none rounded-lg border-2 border-primary bg-background p-3 shadow-lg">
            <p className="truncate text-sm font-medium text-foreground">{formatLeadName(activeLead)}</p>
            {activeLead.phone_number ? (
              <p className="mt-0.5 truncate font-mono text-xs text-foreground/60">{activeLead.phone_number}</p>
            ) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
