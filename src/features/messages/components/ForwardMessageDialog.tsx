"use client";

import { useMemo, useState } from "react";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";
import { Magnifier as Search } from "@gravity-ui/icons";

import { telegramChatName, type TelegramChat } from "@/features/messages/types";

export interface ForwardMessageDialogProps {
  sourceChatId: string;
  /** Count only, for the "Forward N message(s)" subtitle. */
  messageCount: number;
  chats: TelegramChat[];
  isSubmitting: boolean;
  onForward: (targetChatId: string) => Promise<unknown>;
  onClose: () => void;
}

/**
 * "Forward to…" chat picker — `POST /telegram-meassages/forward`
 * (`services/api/telegramMessages.ts`'s `forward`). Mirrors the old
 * frontend's `ForwardTelegramMessageDialog.tsx` (search + pick-a-chat list,
 * source chat excluded), but reuses the already-loaded Telegram chat list
 * from `TelegramPanel` instead of its own separate fetch — that list is
 * already paginated/searched server-side for the sidebar, and forwarding
 * targets are the same chat set, so a second parallel fetch would just be
 * a redundant request for data the panel already has in cache. Follows
 * this codebase's `LinkLeadDialog.tsx` modal structure/conventions.
 */
export function ForwardMessageDialog({ sourceChatId, messageCount, chats, isSubmitting, onForward, onClose }: ForwardMessageDialogProps) {
  const [search, setSearch] = useState("");
  const [targetChatId, setTargetChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => chats.filter((c) => c.id !== sourceChatId), [chats, sourceChatId]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => telegramChatName(c).toLowerCase().includes(q));
  }, [candidates, search]);

  async function handleForward() {
    if (!targetChatId || isSubmitting) return;
    setError(null);
    try {
      await onForward(targetChatId);
      onClose();
    } catch {
      setError("Failed to forward. Try again.");
    }
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Forward message{messageCount === 1 ? "" : "s"}</Modal.Heading>
              <p className="text-sm text-foreground/60">
                Forward {messageCount} message{messageCount === 1 ? "" : "s"} to another chat.
              </p>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <TextField value={search} onChange={setSearch}>
                <Label>Search chats</Label>
                <Input placeholder="Search by name or username…" />
              </TextField>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-black/[0.08] dark:border-white/[0.12]">
                {filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-foreground/50">
                    <Search className="mx-auto mb-1 size-4" aria-hidden="true" />
                    No chats found.
                  </p>
                ) : (
                  <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                    {filtered.map((chat) => (
                      <li key={chat.id}>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setTargetChatId(chat.id)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--default)] disabled:cursor-not-allowed disabled:opacity-50 ${
                            targetChatId === chat.id ? "bg-[var(--default)] font-medium" : ""
                          }`}
                        >
                          {telegramChatName(chat)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button isDisabled={!targetChatId || isSubmitting} onPress={() => void handleForward()}>
                {isSubmitting ? "Forwarding…" : "Forward"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
