"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";

import { useLeadsBoardsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import { useAddLeadColumnsQuery } from "@/features/leads/hooks/useAddLeadColumnsQuery";
import { leadsApi } from "@/services/api/leads";

export interface CreateLeadFromChatDialogProps {
  isOpen: boolean;
  workspaceId: string;
  chatName?: string;
  chatUsername?: string | null;
  onClose: () => void;
  onLeadCreated: (leadId: string) => Promise<unknown>;
}

export function CreateLeadFromChatDialog({
  isOpen,
  workspaceId,
  chatName,
  chatUsername,
  onClose,
  onLeadCreated,
}: CreateLeadFromChatDialogProps) {
  const boardsQuery = useLeadsBoardsQuery(workspaceId, isOpen);
  const boardId = boardsQuery.data?.[0]?.id ?? null;
  const columnsQuery = useAddLeadColumnsQuery(boardId);
  const defaultColumnId = columnsQuery.data?.[0]?.id ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const parts = (chatName || "").trim().split(/\s+/);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
    setPhone("");
    setError(null);
  }, [isOpen, chatName]);

  async function handleSave() {
    if (!firstName.trim() || !defaultColumnId) {
      setError(defaultColumnId ? "First name is required." : "No pipeline stage available — set up a leads board first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const lead = await leadsApi.createLead({
        workspace_id: workspaceId,
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        phone_number: phone.trim() || undefined,
        column_id: defaultColumnId,
        custom_fields: {},
      });
      await onLeadCreated(lead.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>Create lead from chat</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <p className="text-sm text-foreground/60">Create a new lead and link it to this conversation.</p>
            <TextField isRequired>
              <Label>First name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </TextField>
            <TextField>
              <Label>Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </TextField>
            <TextField>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            </TextField>
            {chatUsername ? (
              <p className="rounded-lg bg-[var(--default)] px-3 py-2 text-xs text-foreground/50">@{chatUsername.replace(/^@/, "")}</p>
            ) : null}
            {error ? <p className="text-xs text-danger">{error}</p> : null}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={onClose} isDisabled={saving}>
              Cancel
            </Button>
            <Button onPress={() => void handleSave()} isDisabled={saving || !firstName.trim()}>
              {saving ? "Creating…" : "Create & link"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
