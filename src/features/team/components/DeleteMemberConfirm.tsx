"use client";

import { useState } from "react";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";

/**
 * Type-to-confirm delete — ported from the old frontend's
 * `DeleteConfirmDialog` pattern (type the member's email to enable the
 * destructive action), replacing a plain confirm button.
 */
export function DeleteMemberConfirm({
  isOpen,
  memberName,
  memberEmail,
  loading,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  memberName: string;
  memberEmail: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const confirmPhrase = memberEmail || "REMOVE";
  const canConfirm = typed.trim() === confirmPhrase;

  function handleClose() {
    setTyped("");
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Remove {memberName}?</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-sm text-foreground/70">
                This permanently removes {memberName} from the workspace. This can&apos;t be undone.
              </p>
              <TextField value={typed} onChange={(value) => setTyped(value)}>
                <Label>{`Type "${confirmPhrase}" to confirm`}</Label>
                <Input placeholder={confirmPhrase} autoComplete="off" />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose}>
                Cancel
              </Button>
              <Button variant="danger" isDisabled={!canConfirm || loading} onPress={onConfirm}>
                {loading ? "Removing…" : "Remove member"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
