"use client";

import { Modal } from "@heroui/react";

import { LeadAutomationsPanel } from "@/features/lead-automations/components/LeadAutomationsPanel";

/**
 * Board-scoped entry point (Phase 2c-10) for the same rule engine already
 * built for Settings → Lead Automations (`features/lead-automations/`) —
 * same `automation_rules` table/backend contract, same
 * `LeadAutomationsPanel`, just opened with `boardId` set so new rules are
 * stamped with this board's id and the list only shows rules scoped to it
 * (plus any workspace-wide rule, which applies to every board). Traced
 * 1:1 from the old frontend's `LeadAutomationsDialog.tsx`, which is itself
 * a thin `Dialog` wrapper around `LeadAutomationsPanel boardId variant="dialog"`
 * — no separate backend concept, so this stays a thin wrapper here too.
 */
export function LeadBoardAutomationsDialog({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Board automations</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="max-h-[70vh] overflow-y-auto">
              <p className="mb-3 text-sm text-foreground/60">
                Rules scoped to this board — trigger on lead events and auto-move, assign, notify, or edit leads.
              </p>
              <LeadAutomationsPanel boardId={boardId} variant="dialog" />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
