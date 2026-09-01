"use client";

import { useMemo, useState } from "react";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";
import { Magnifier as Search, PersonPlus } from "@gravity-ui/icons";

import { useDebounce } from "@/hooks/useDebounce";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useTelegramAccountAddContactMutation,
  useTelegramAccountContactsQuery,
  useTelegramStartChatMutation,
} from "@/features/messages/hooks/useTelegramAccount";

export interface TelegramStartChatDialogProps {
  workspaceId: string;
  onChatOpened: (chatId: string) => void;
  onClose: () => void;
}

function contactName(c: { first_name?: string | null; last_name?: string | null; username?: string | null; phone?: string | null }) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (c.username) return `@${c.username}`;
  return c.phone || "Unknown";
}

export function TelegramStartChatDialog({ workspaceId, onChatOpened, onClose }: TelegramStartChatDialogProps) {
  const [tab, setTab] = useState<"new" | "contacts">("new");
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addName, setAddName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 200);

  const contactsQuery = useTelegramAccountContactsQuery(tab === "contacts");
  const startChat = useTelegramStartChatMutation(workspaceId);
  const addContact = useTelegramAccountAddContactMutation();

  const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data]);
  const filteredContacts = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => contactName(c).toLowerCase().includes(q) || (c.phone || "").includes(q));
  }, [contacts, debouncedQuery]);

  async function openByPhone(raw: string, keepContact = false) {
    const trimmed = raw.trim();
    if (!trimmed || startChat.isPending) return;
    setError(null);
    try {
      const digits = trimmed.replace(/\D/g, "");
      const looksLikePhone = (trimmed.startsWith("+") || /^[\d\s().-]+$/.test(trimmed)) && digits.length >= 7;
      const result = looksLikePhone
        ? await startChat.mutateAsync({ kind: "phone", phone: trimmed.replace(/[^\d+]/g, ""), keep_contact: keepContact })
        : await startChat.mutateAsync({ kind: "username", username: trimmed.replace(/^@/, "") });
      const chatId = result.chat?.id;
      if (!chatId) throw new Error("Chat opened but no id returned.");
      onChatOpened(chatId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start chat.");
    }
  }

  async function openByContact(userId: number) {
    if (startChat.isPending) return;
    setError(null);
    try {
      const result = await startChat.mutateAsync({ kind: "user", user_id: userId });
      const chatId = result.chat?.id;
      if (!chatId) throw new Error("Chat opened but no id returned.");
      onChatOpened(chatId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open chat.");
    }
  }

  async function handleAddContact() {
    if (!addPhone.trim() || addContact.isPending) return;
    setError(null);
    try {
      await addContact.mutateAsync({ phone: addPhone.trim(), first_name: addName.trim() || undefined });
      setAddPhone("");
      setAddName("");
      await contactsQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact.");
    }
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Start a chat</Modal.Heading>
              <p className="text-sm text-foreground/60">Open a private Telegram chat by phone, username, or from your contacts.</p>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab("new")}
                  className={`h-8 rounded-full px-3 text-xs font-medium ${tab === "new" ? "bg-[#26A5E4]/15 text-[#1b7fb0]" : "text-foreground/60"}`}
                >
                  New chat
                </button>
                <button
                  type="button"
                  onClick={() => setTab("contacts")}
                  className={`h-8 rounded-full px-3 text-xs font-medium ${tab === "contacts" ? "bg-[#26A5E4]/15 text-[#1b7fb0]" : "text-foreground/60"}`}
                >
                  Contacts
                </button>
              </div>

              {tab === "new" ? (
                <div className="space-y-3">
                  <TextField>
                    <Label>Phone or @username</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567 or @username" fullWidth />
                  </TextField>
                  <Button fullWidth onPress={() => void openByPhone(phone)} isDisabled={!phone.trim() || startChat.isPending}>
                    {startChat.isPending ? "Opening…" : "Open chat"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
                    <Input aria-label="Search contacts" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts…" className="pl-8" fullWidth />
                  </div>

                  <div className="rounded-lg border border-black/10 p-3 dark:border-white/10">
                    <p className="mb-2 text-xs font-medium text-foreground/70">Add contact</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="Phone" fullWidth />
                      <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="First name" fullWidth />
                      <Button isIconOnly aria-label="Add contact" onPress={() => void handleAddContact()} isDisabled={!addPhone.trim() || addContact.isPending}>
                        <PersonPlus className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {contactsQuery.isLoading ? (
                      <LoadingState label="Loading contacts…" />
                    ) : filteredContacts.length === 0 ? (
                      <EmptyState title="No contacts" description="Add a contact or sync your Telegram account." />
                    ) : (
                      <ul className="divide-y divide-black/5 dark:divide-white/10">
                        {filteredContacts.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between px-2 py-2.5 text-left hover:bg-[var(--default)]"
                              onClick={() => void openByContact(c.id)}
                              disabled={startChat.isPending}
                            >
                              <span className="text-sm font-medium">{contactName(c)}</span>
                              {c.phone ? <span className="text-xs text-foreground/50">{c.phone}</span> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {error ? (
                <p role="alert" className="text-xs text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
