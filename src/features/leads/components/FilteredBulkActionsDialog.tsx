"use client";

import { useState } from "react";
import { Button, Input, ListBox, Modal, Select } from "@heroui/react";
import { Archive, ArrowRight, Layers, PersonPlus, Thunderbolt, TrashBin } from "@gravity-ui/icons";

import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { useFilteredBulkExecuteMutation, useFilteredBulkPreviewQuery } from "@/features/leads/hooks/useFilteredBulkActions";
import { useLeadsBoardsQuery, useLeadsBoardColumnsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import { countActiveLeadFilters, type LeadBoardColumn, type LeadFilters } from "@/features/leads/types";
import type { FilteredBulkAction, StageMoveMapping } from "@/services/api/leads";

type ActionPanel = "assign" | "move" | "archive" | "delete" | null;

/**
 * Filtered bulk actions — acts on every lead matching the current `filters`
 * (not just an explicit row selection), via the real `leads-list.controller`
 * `bulk/preview`/`bulk/execute` endpoints (see `leadsListBulkApi`'s doc
 * comment in `services/api/leads.ts`). Active tab only. UX pattern (preview
 * count, panel-per-action, type-the-count-to-confirm on delete,
 * window.confirm on archive) mirrors the old frontend's
 * `FilteredBulkActionsDialog.tsx` — not copied visually, same safety
 * contract for a mass, filter-scoped mutation.
 */
export function FilteredBulkActionsDialog({
  boardId,
  workspaceId,
  filters,
  columns,
  operators,
  onClose,
}: {
  boardId: string;
  workspaceId: string;
  filters: LeadFilters;
  columns: LeadBoardColumn[];
  operators: { id: string; label: string }[];
  onClose: () => void;
}) {
  const [activePanel, setActivePanel] = useState<ActionPanel>(null);
  const [assignOperatorId, setAssignOperatorId] = useState("");
  const [targetBoardId, setTargetBoardId] = useState(boardId);
  const [targetColumnId, setTargetColumnId] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preview = useFilteredBulkPreviewQuery({ boardId, filters }, true);
  const execute = useFilteredBulkExecuteMutation(boardId);
  const boardsQuery = useLeadsBoardsQuery(workspaceId, true);
  const isSameBoard = targetBoardId === boardId;
  const targetBoardColumnsQuery = useLeadsBoardColumnsQuery(isSameBoard ? null : targetBoardId);

  const matchCount = preview.data?.count ?? 0;
  const activeFilterCount = countActiveLeadFilters(filters);
  const boards = boardsQuery.data ?? [];
  const targetColumns = isSameBoard ? columns.map((c) => ({ id: c.id, name: c.name })) : (targetBoardColumnsQuery.data ?? []);

  async function run(action: FilteredBulkAction, extra: Partial<{ columnId: string; operatorId: string | null; targetBoardId: string; stageMapping: StageMoveMapping[] }> = {}) {
    if (execute.isPending || matchCount === 0) return; // guard double-submit + empty-match no-op
    setError(null);
    try {
      // No toast system in this feature yet — success is surfaced by the
      // dialog closing and every affected list view refetching via
      // `useFilteredBulkExecuteMutation`'s invalidation, same as every
      // other mutation in this feature.
      await execute.mutateAsync({ boardId, filters, action, ...extra });
      onClose();
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  function handleAssign() {
    if (!assignOperatorId) return;
    void run("assign", { operatorId: assignOperatorId === "unassign" ? null : assignOperatorId });
  }

  function handleMove() {
    if (!targetColumnId) return;
    if (isSameBoard) {
      void run("move", { columnId: targetColumnId });
    } else {
      // Every column on the *current* board mapped to the one chosen target
      // column — safe even for source columns that happen to have no
      // matching leads right now (the backend only consults mappings for
      // the stages the moved leads are actually in).
      const stageMapping: StageMoveMapping[] = columns.map((c) => ({ sourceColumnId: c.id, targetColumnId }));
      void run("moveBoard", { targetBoardId, stageMapping });
    }
  }

  function handleArchive() {
    if (window.confirm(`Archive all ${matchCount} matching lead(s)?`)) {
      void run("archive");
    }
  }

  function handleDelete() {
    if (deleteConfirmText.trim() !== String(matchCount)) {
      setError(`Type ${matchCount} to confirm.`);
      return;
    }
    void run("delete");
  }

  const panels: { key: Exclude<ActionPanel, null>; icon: typeof PersonPlus; label: string }[] = [
    { key: "assign", icon: PersonPlus, label: "Assign" },
    { key: "move", icon: ArrowRight, label: "Move" },
    { key: "archive", icon: Archive, label: "Archive" },
    { key: "delete", icon: TrashBin, label: "Delete" },
  ];

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <Thunderbolt className="size-4 text-primary" aria-hidden="true" />
                Bulk actions on filtered leads
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              <p className="text-sm text-foreground/60">
                Acts on every lead matching the current filters — not just what&apos;s visible on screen.
              </p>

              <div className="rounded-lg border border-black/[0.08] bg-[var(--default)] px-3 py-2.5 dark:border-white/[0.12]">
                {preview.isLoading ? (
                  <p className="text-sm text-foreground/60">Counting matching leads…</p>
                ) : preview.isError ? (
                  <p className="text-sm text-danger">{leadActionErrorMessage(preview.error)}</p>
                ) : (
                  <p className="text-sm font-semibold text-foreground">
                    {matchCount} matching lead{matchCount === 1 ? "" : "s"}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-foreground/50">
                  {activeFilterCount > 0 ? `${activeFilterCount} filter(s) active` : "No filters active — this matches every open lead on the board."}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {panels.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePanel((prev) => (prev === key ? null : key))}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-colors ${
                      activePanel === key
                        ? key === "delete"
                          ? "border-danger bg-danger/5"
                          : "border-primary bg-primary/5"
                        : "border-black/[0.08] hover:border-black/20 dark:border-white/[0.12] dark:hover:border-white/30"
                    }`}
                  >
                    <Icon className={`size-4 ${activePanel === key ? (key === "delete" ? "text-danger" : "text-primary") : "text-foreground/50"}`} aria-hidden="true" />
                    <span className={`text-xs font-medium ${key === "delete" && activePanel === key ? "text-danger" : "text-foreground"}`}>{label}</span>
                  </button>
                ))}
              </div>

              {activePanel === "assign" ? (
                <div className="flex flex-col gap-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
                  <Select
                    aria-label="Assign to operator"
                    value={assignOperatorId || undefined}
                    placeholder="Select operator…"
                    onChange={(key) => typeof key === "string" && setAssignOperatorId(key)}
                    variant="secondary"
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
                  <Button variant="secondary" isDisabled={!assignOperatorId || execute.isPending || matchCount === 0} onPress={handleAssign}>
                    <PersonPlus className="size-4" aria-hidden="true" />
                    Assign all {matchCount}
                  </Button>
                </div>
              ) : null}

              {activePanel === "move" ? (
                <div className="flex flex-col gap-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
                  <p className="text-xs text-foreground/50">Target board</p>
                  <Select
                    aria-label="Target board"
                    value={targetBoardId}
                    onChange={(key) => {
                      if (typeof key === "string") {
                        setTargetBoardId(key);
                        setTargetColumnId("");
                      }
                    }}
                    variant="secondary"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox items={boards.map((b) => ({ id: b.id, label: b.id === boardId ? `${b.name} (current)` : b.name }))}>
                        {(opt) => (
                          <ListBox.Item id={opt.id} textValue={opt.label}>
                            {opt.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <p className="mt-1 text-xs text-foreground/50">{isSameBoard ? "Destination stage" : "Every current stage will move into this one stage on the target board"}</p>
                  <Select
                    aria-label="Target column"
                    value={targetColumnId || undefined}
                    placeholder="Select a stage…"
                    onChange={(key) => typeof key === "string" && setTargetColumnId(key)}
                    variant="secondary"
                    isDisabled={!isSameBoard && targetBoardColumnsQuery.isLoading}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox items={targetColumns.map((c) => ({ id: c.id, label: c.name }))}>
                        {(opt) => (
                          <ListBox.Item id={opt.id} textValue={opt.label}>
                            {opt.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <Button variant="secondary" isDisabled={!targetColumnId || execute.isPending || matchCount === 0} onPress={handleMove}>
                    <Layers className="size-4" aria-hidden="true" />
                    Move all {matchCount}
                  </Button>
                </div>
              ) : null}

              {activePanel === "archive" ? (
                <div className="rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
                  <Button variant="secondary" isDisabled={execute.isPending || matchCount === 0} onPress={handleArchive}>
                    <Archive className="size-4" aria-hidden="true" />
                    Archive all {matchCount}
                  </Button>
                </div>
              ) : null}

              {activePanel === "delete" ? (
                <div className="flex flex-col gap-2 rounded-lg border border-danger/30 p-3">
                  <p className="text-xs text-foreground/60">
                    This moves all {matchCount} matching lead(s) to Trash. Type <span className="font-mono font-semibold">{matchCount}</span> to confirm.
                  </p>
                  <Input
                    aria-label="Type the match count to confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={String(matchCount)}
                  />
                  <Button variant="danger" isDisabled={execute.isPending || matchCount === 0} onPress={handleDelete}>
                    <TrashBin className="size-4" aria-hidden="true" />
                    Delete all {matchCount}
                  </Button>
                </div>
              ) : null}

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
