"use client";

import { useEffect, useState } from "react";
import { Button, Modal } from "@heroui/react";

export type TelegramDeleteScope = "everyone" | "me";

export interface TelegramDeleteMessagesDialogProps {
  count: number;
  isOpen: boolean;
  isSubmitting: boolean;
  /** Linked user-account chats can revoke on Telegram; bot/business uses local-only for "me". */
  isAccountChat: boolean;
  onConfirm: (scope: TelegramDeleteScope) => Promise<void>;
  onClose: () => void;
}

export function TelegramDeleteMessagesDialog({
  count,
  isOpen,
  isSubmitting,
  isAccountChat,
  onConfirm,
  onClose,
}: TelegramDeleteMessagesDialogProps) {
  const [scope, setScope] = useState<TelegramDeleteScope>("everyone");

  useEffect(() => {
    if (isOpen) setScope("everyone");
  }, [isOpen]);

  const label = count === 1 ? "Delete this message?" : `Delete ${count} messages?`;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{label}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Delete scope</legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 p-3 text-sm dark:border-white/10">
                  <input
                    type="radio"
                    name="telegram-delete-scope"
                    className="mt-0.5"
                    checked={scope === "everyone"}
                    disabled={isSubmitting}
                    onChange={() => setScope("everyone")}
                  />
                  <span>
                    <span className="block font-medium text-foreground">Delete for everyone</span>
                    <span className="mt-0.5 block text-xs text-foreground/60">
                      {isAccountChat
                        ? "Removes the message on Telegram for all participants."
                        : "Removes the message on Telegram when the bot is allowed to delete it."}
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 p-3 text-sm dark:border-white/10">
                  <input
                    type="radio"
                    name="telegram-delete-scope"
                    className="mt-0.5"
                    checked={scope === "me"}
                    disabled={isSubmitting}
                    onChange={() => setScope("me")}
                  />
                  <span>
                    <span className="block font-medium text-foreground">Delete for me only</span>
                    <span className="mt-0.5 block text-xs text-foreground/60">
                      {isAccountChat
                        ? "Hides the message on your linked Telegram account and removes it from this inbox."
                        : "Removes the message from this inbox only — it stays on Telegram for everyone else."}
                    </span>
                  </span>
                </label>
              </fieldset>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={isSubmitting} onPress={onClose}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isDisabled={isSubmitting}
                onPress={() => void onConfirm(scope)}
              >
                {isSubmitting ? "Deleting…" : "Delete"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
