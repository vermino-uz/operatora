"use client";

import { useState } from "react";
import { Button, ListBox, Select } from "@heroui/react";
import { Archive, ArrowRight, PersonPlus, TrashBin, Xmark } from "@gravity-ui/icons";

import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import {
  useBulkArchiveLeadsMutation,
  useBulkAssignOperatorMutation,
  useBulkDeleteLeadsMutation,
  useBulkMoveColumnMutation,
} from "@/features/leads/hooks/useLeadMutations";
import type { LeadBoardColumn } from "@/features/leads/types";
import type { LeadSelection } from "@/features/leads/hooks/useLeadSelection";

/**
 * Row-selection bulk-actions toolbar — appears once ≥1 lead is selected on
 * the Active tab (Kanban and/or List, same shared `LeadSelection`). Uses the
 * real bulk-capable id-array endpoints traced in `services/api/leads.ts`
 * (`change-column`/`assign-operator`/`delete-leads`/`archive-multiple`), not
 * a client-side loop of single-lead calls. Distinct from
 * `FilteredBulkActionsDialog`, which acts on every lead matching the current
 * *filters* rather than an explicit selection.
 */
export function BulkActionsBar({
  boardId,
  selection,
  columns,
  operators,
}: {
  boardId: string;
  selection: LeadSelection;
  columns: LeadBoardColumn[];
  operators: { id: string; label: string }[];
}) {
  const [moveColumnId, setMoveColumnId] = useState("");
  const [assignOperatorId, setAssignOperatorId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const moveColumn = useBulkMoveColumnMutation(boardId);
  const assignOperator = useBulkAssignOperatorMutation(boardId);
  const archiveLeads = useBulkArchiveLeadsMutation(boardId);
  const deleteLeads = useBulkDeleteLeadsMutation(boardId);

  const pending = moveColumn.isPending || assignOperator.isPending || archiveLeads.isPending || deleteLeads.isPending;
  const leadIds = selection.selectedIds;

  async function runGuarded(fn: () => Promise<unknown>) {
    if (pending) return; // guard double-submit — one bulk action at a time
    setError(null);
    try {
      await fn();
      selection.clear();
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-black/[0.08] bg-[var(--default)] px-4 py-2.5 dark:border-white/[0.12]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{leadIds.length} selected</span>

        <Select
          aria-label="Assign to operator"
          value={assignOperatorId || undefined}
          placeholder="Assign to…"
          onChange={(key) => typeof key === "string" && setAssignOperatorId(key)}
          variant="secondary"
          className="w-44"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={[{ id: "unassign", label: "Unassign" }, ...operators]}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={!assignOperatorId || pending}
          onPress={() =>
            runGuarded(() =>
              assignOperator.mutateAsync({
                leadIds,
                operatorId: assignOperatorId === "unassign" ? null : assignOperatorId,
              }),
            )
          }
        >
          <PersonPlus className="size-3.5" aria-hidden="true" />
          Assign
        </Button>

        <Select
          aria-label="Move to column"
          value={moveColumnId || undefined}
          placeholder="Move to…"
          onChange={(key) => typeof key === "string" && setMoveColumnId(key)}
          variant="secondary"
          className="w-44"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={columns.map((c) => ({ id: c.id, label: c.name }))}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={!moveColumnId || pending}
          onPress={() => runGuarded(() => moveColumn.mutateAsync({ leadIds, columnId: moveColumnId }))}
        >
          <ArrowRight className="size-3.5" aria-hidden="true" />
          Move
        </Button>

        <Button
          size="sm"
          variant="secondary"
          isDisabled={pending}
          onPress={() => {
            if (window.confirm(`Archive ${leadIds.length} selected lead(s)?`)) {
              void runGuarded(() => archiveLeads.mutateAsync(leadIds));
            }
          }}
        >
          <Archive className="size-3.5" aria-hidden="true" />
          Archive
        </Button>

        <Button
          size="sm"
          variant="secondary"
          isDisabled={pending}
          onPress={() => {
            if (window.confirm(`Delete ${leadIds.length} selected lead(s)? They'll be moved to Trash.`)) {
              void runGuarded(() => deleteLeads.mutateAsync(leadIds));
            }
          }}
        >
          <TrashBin className="size-3.5 text-danger" aria-hidden="true" />
          Delete
        </Button>

        <Button size="sm" variant="ghost" isDisabled={pending} onPress={() => selection.clear()}>
          <Xmark className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
