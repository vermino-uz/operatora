"use client";

import { Button, Modal } from "@heroui/react";

/**
 * Generic confirm/destructive-action dialog — the admin console needs this
 * repeatedly (suspend/reactivate/expire/revoke/delete workspace, delete
 * user, delete feedback, etc.) and no shared version existed yet
 * (ARCHITECTURE.md planned one under `components/shared/` but only
 * feature-specific variants like `DeleteMemberConfirm` existed). Kept
 * generic/reusable rather than admin-specific.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDanger = false,
  isLoading = false,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            {description ? <Modal.Body className="text-sm text-foreground/70">{description}</Modal.Body> : null}
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isLoading}>
                {cancelLabel}
              </Button>
              <Button variant={isDanger ? "danger" : "primary"} onPress={onConfirm} isDisabled={isLoading}>
                {isLoading ? "Working…" : confirmLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
