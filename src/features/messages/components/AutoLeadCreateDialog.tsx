"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Modal, Switch } from "@heroui/react";

import { useAllLeadsBoardColumnsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import { useCreateColumnMutation } from "@/features/leads/hooks/useColumnManagement";
import type { AutoLeadCreateChannel } from "@/services/api/autoLeadCreate";
import { autoLeadCreateApi } from "@/services/api/autoLeadCreate";

export interface AutoLeadCreateDialogProps {
  isOpen: boolean;
  workspaceId: string;
  channel: AutoLeadCreateChannel;
  channelLabel: string;
  onClose: () => void;
}

/** Workspace setting — auto-create leads when new conversations arrive on a channel. */
export function AutoLeadCreateDialog({
  isOpen,
  workspaceId,
  channel,
  channelLabel,
  onClose,
}: AutoLeadCreateDialogProps) {
  const { boards, columns, isLoading } = useAllLeadsBoardColumnsQuery(isOpen ? workspaceId : null);

  const [enabled, setEnabled] = useState(false);
  const [autoCreateStage, setAutoCreateStage] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createColumn = useCreateColumnMutation(selectedBoardId || boards[0]?.id || "");

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    void (async () => {
      try {
        const settings = await autoLeadCreateApi.list(workspaceId);
        const row = settings.find((s) => s.channel === channel);
        setEnabled(row?.enabled ?? false);
        setAutoCreateStage(row?.auto_create_stage ?? false);
        setSelectedStageId(row?.stage_id ?? "");
      } catch {
        setError("Couldn't load settings.");
      }
    })();
  }, [isOpen, workspaceId, channel]);

  useEffect(() => {
    if (!boards.length || selectedBoardId) return;
    setSelectedBoardId(boards[0]!.id);
  }, [boards, selectedBoardId]);

  useEffect(() => {
    if (selectedStageId || !columns.length) return;
    setSelectedStageId(columns[0]!.id);
  }, [columns, selectedStageId]);

  async function handleCreateStage() {
    if (!newStageName.trim() || !selectedBoardId) return;
    try {
      const created = await createColumn.mutateAsync({ name: newStageName.trim() });
      setSelectedStageId(created.id);
      setNewStageName("");
      setShowCreateForm(false);
    } catch {
      setError("Couldn't create stage.");
    }
  }

  async function handleSave() {
    if (enabled && !selectedStageId && !autoCreateStage) {
      setError("Select a stage or enable auto-create.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await autoLeadCreateApi.upsert({
        workspaceId,
        channel,
        enabled,
        pipelineId: null,
        stageId: enabled ? selectedStageId || null : null,
        autoCreateStage: enabled && autoCreateStage,
      });
      onClose();
    } catch {
      setError("Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="md">
        <Modal.Dialog className="max-w-md">
          <Modal.Header>
            <Modal.Heading>Auto-create leads</Modal.Heading>
            <p className="text-sm text-foreground/55">Automatically create leads when messages arrive on {channelLabel}.</p>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex items-center justify-between rounded-lg bg-[var(--default)] p-3">
              <Label htmlFor="auto-lead-enabled">Enable auto-lead creation</Label>
              <Switch id="auto-lead-enabled" isSelected={enabled} onChange={setEnabled}>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>

            {enabled ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="auto-lead-stage">Default stage</Label>
                  <select
                    id="auto-lead-stage"
                    value={selectedStageId}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                    disabled={isLoading || autoCreateStage}
                    className="h-9 w-full rounded-lg border border-black/10 bg-[var(--default)] px-3 text-sm dark:border-white/10"
                  >
                    <option value="">Select stage…</option>
                    {columns.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.board_name} · {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[var(--default)] p-3">
                  <Label htmlFor="auto-create-stage">Auto-create new stage</Label>
                  <Switch id="auto-create-stage" isSelected={autoCreateStage} onChange={setAutoCreateStage}>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>

                {autoCreateStage ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="auto-lead-board">Stage pipeline</Label>
                      <select
                        id="auto-lead-board"
                        value={selectedBoardId}
                        onChange={(e) => setSelectedBoardId(e.target.value)}
                        className="h-9 w-full rounded-lg border border-black/10 bg-[var(--default)] px-3 text-sm dark:border-white/10"
                      >
                        {boards.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!showCreateForm ? (
                      <Button variant="secondary" fullWidth onPress={() => setShowCreateForm(true)}>
                        Create new stage
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          placeholder="Stage name"
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            fullWidth
                            onPress={() => {
                              setShowCreateForm(false);
                              setNewStageName("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            fullWidth
                            isDisabled={!newStageName.trim() || createColumn.isPending}
                            onPress={() => void handleCreateStage()}
                          >
                            {createColumn.isPending ? "Creating…" : "Create"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button isDisabled={saving} onPress={() => void handleSave()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
