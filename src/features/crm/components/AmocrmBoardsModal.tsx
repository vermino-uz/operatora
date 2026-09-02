"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { ChevronDown, ChevronRight } from "@gravity-ui/icons";

import type { AmocrmBoardPreview } from "@/features/crm/types";

/** Plain native checkbox with `indeterminate` support (a "some selected"
 * tri-state a native `<input>` prop can express but React's `checked`
 * cannot) — avoids guessing at an unverified HeroUI `Checkbox` compound
 * anatomy for a one-off tri-state control. */
function BoardCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="size-4 shrink-0 rounded-md accent-primary"
    />
  );
}

/** Board/status selection dialog before an amoCRM import — traced from the
 * old frontend's inline modal in `AmocrmIntegrationSettings.tsx`. Defaults
 * to everything selected (matches "import the whole account" when the
 * owner doesn't change anything). */
export function AmocrmBoardsModal({
  boards,
  onClose,
  onConfirm,
}: {
  boards: AmocrmBoardPreview[] | null;
  onClose: () => void;
  onConfirm: (selectedStatusIds: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Reset selection whenever a new `boards` preview arrives — adjusted
  // during render (React's documented pattern for resetting state on a
  // prop change, already established elsewhere in this codebase, e.g.
  // `useConversationAudio`) rather than in an effect, so it doesn't trigger
  // a cascading extra render via a synchronous setState-in-effect.
  const [trackedBoards, setTrackedBoards] = useState(boards);
  if (boards !== trackedBoards) {
    setTrackedBoards(boards);
    setSelected(new Set(boards ? boards.flatMap((b) => b.statuses.map((s) => s.id)) : []));
    setExpanded(new Set());
  }

  if (!boards) return null;

  function boardState(board: AmocrmBoardPreview): "all" | "some" | "none" {
    const count = board.statuses.filter((s) => selected.has(s.id)).length;
    if (count === 0) return "none";
    if (count === board.statuses.length) return "all";
    return "some";
  }

  function toggleBoard(board: AmocrmBoardPreview) {
    const allSelected = boardState(board) === "all";
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of board.statuses) {
        if (allSelected) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
  }

  function toggleStatus(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Choose what to import</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
              {boards.map((board) => {
                const state = boardState(board);
                const isExpanded = expanded.has(board.id);
                return (
                  <div key={board.id} className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.12]">
                    <div className="flex items-center gap-2 bg-black/[0.02] p-2.5 dark:bg-white/[0.04]">
                      <BoardCheckbox
                        checked={state === "all"}
                        indeterminate={state === "some"}
                        onChange={() => toggleBoard(board)}
                        label={`Select all of ${board.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleExpanded(board.id)}
                        className="flex flex-1 min-w-0 items-center gap-1.5 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-3.5 shrink-0 text-foreground/40" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="size-3.5 shrink-0 text-foreground/40" aria-hidden="true" />
                        )}
                        <span className="truncate text-sm font-medium text-foreground">{board.name}</span>
                      </button>
                      <span className="shrink-0 text-xs text-foreground/50">{board.count} leads</span>
                    </div>
                    {isExpanded ? (
                      <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                        {board.statuses.map((status) => (
                          <label
                            key={status.id}
                            className="flex cursor-pointer items-center gap-2 py-2 pl-8 pr-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(status.id)}
                              onChange={() => toggleStatus(status.id)}
                              className="size-3.5"
                            />
                            {status.color ? (
                              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                            ) : null}
                            <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">{status.name}</span>
                            <span className="shrink-0 text-xs text-foreground/50">{status.count}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </Modal.Body>
            <Modal.Footer className="flex items-center justify-between gap-3">
              <p className="text-xs text-foreground/60">
                {selected.size === 0 ? "Nothing selected" : `${selected.size} statuses selected`}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onPress={onClose}>
                  Cancel
                </Button>
                <Button isDisabled={selected.size === 0} onPress={() => onConfirm(Array.from(selected))}>
                  Next
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
