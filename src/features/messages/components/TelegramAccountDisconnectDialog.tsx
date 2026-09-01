"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";

export interface TelegramAccountDisconnectDialogProps {
  accountLabel: string;
  conversationCount: number;
  isOpen: boolean;
  isSubmitting: boolean;
  onConfirm: (deleteConversations: boolean) => Promise<void>;
  onClose: () => void;
}

export function TelegramAccountDisconnectDialog({
  accountLabel,
  conversationCount,
  isOpen,
  isSubmitting,
  onConfirm,
  onClose,
}: TelegramAccountDisconnectDialogProps) {
  const [deleteConversations, setDeleteConversations] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setDeleteConversations(false);
          onClose();
        }
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Log out of Telegram account</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-sm text-foreground/70">
                <span className="font-medium text-foreground">{accountLabel}</span> will be logged out of Operatora.
                New messages will stop syncing until you link again. You can switch back to the Business bot inbox afterward.
              </p>
              <label className="flex items-start gap-2 rounded-lg border border-black/10 p-3 text-sm dark:border-white/10">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={deleteConversations}
                  disabled={isSubmitting}
                  onChange={(e) => setDeleteConversations(e.target.checked)}
                />
                <span>
                  <span className="block font-medium text-foreground">Also delete synced conversations</span>
                  <span className="mt-0.5 block text-xs text-foreground/60">
                    {conversationCount > 0
                      ? `Removes ${conversationCount} conversation${conversationCount === 1 ? "" : "s"} from this workspace.`
                      : "No conversations to delete — this only ends the linked session."}
                  </span>
                </span>
              </label>
              {!deleteConversations && conversationCount > 0 ? (
                <p className="text-xs text-foreground/50">Existing chats stay in the inbox but won&apos;t receive new messages.</p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={isSubmitting} onPress={onClose}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isDisabled={isSubmitting}
                onPress={() => void onConfirm(deleteConversations).then(() => setDeleteConversations(false))}
              >
                {isSubmitting ? "Logging out…" : "Log out"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
