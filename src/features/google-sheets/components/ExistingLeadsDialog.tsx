"use client";

import { Button, Modal } from "@heroui/react";
import { LayoutCells } from "@gravity-ui/icons";

/** Gate before enabling realtime auto-import on a spreadsheet/tab that
 * already has data rows and has never been synced before — traced from
 * the old frontend's `existingLeadsDialogOpen` flow (`useGoogleSheets.ts`).
 * "Import all" backfills every current row as a lead; "skip existing"
 * marks them as a baseline so only future rows come in. */
export function ExistingLeadsDialog({
  open,
  rowCount,
  busy,
  onImportAll,
  onSkipExisting,
  onClose,
}: {
  open: boolean;
  rowCount: number;
  busy: boolean;
  onImportAll: () => void;
  onSkipExisting: () => void;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>This sheet already has rows</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-2">
              <p className="text-sm text-foreground/70">
                Found {rowCount} existing row(s). What should happen with them before turning on auto-sync?
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={onImportAll}
                className="flex items-start gap-3 rounded-xl border border-black/[0.08] p-3 text-left text-sm hover:bg-black/[0.02] disabled:opacity-60 dark:border-white/[0.12] dark:hover:bg-white/[0.04]"
              >
                <LayoutCells className="mt-0.5 size-4 shrink-0 text-foreground/60" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-foreground">Import all existing rows</span>
                  <span className="block text-xs text-foreground/50">
                    Every current row becomes a lead now; new rows keep syncing after.
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onSkipExisting}
                className="flex items-start gap-3 rounded-xl border border-black/[0.08] p-3 text-left text-sm hover:bg-black/[0.02] disabled:opacity-60 dark:border-white/[0.12] dark:hover:bg-white/[0.04]"
              >
                <LayoutCells className="mt-0.5 size-4 shrink-0 text-foreground/60" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-foreground">Skip existing rows</span>
                  <span className="block text-xs text-foreground/50">
                    Only rows added to the sheet from now on will be imported.
                  </span>
                </span>
              </button>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={busy} onPress={onClose}>
                Cancel
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
