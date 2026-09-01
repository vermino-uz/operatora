"use client";

import { useEffect, useState } from "react";
import { Button, Label, ListBox, Modal, Select, Switch } from "@heroui/react";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useLeadsBoardsQuery, useLeadsBoardColumnsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import {
  useAudioLeadBoardSettingQuery,
  useCallAutofillMutation,
  useSaveAudioLeadBoardSettingMutation,
} from "@/features/conversations/hooks/useConversationsSettings";

function settingsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isForbidden) return "Only workspace managers can change these settings.";
    return error.message;
  }
  return "Couldn't save settings.";
}

/**
 * Conversations page settings — default board for audio-created leads
 * (`AudioLeadBoardDialog` in the old app) plus per-board call-summary
 * custom-field autofill (was wrongly placed under Pipeline settings there;
 * belongs here with the call conversation workflow).
 */
export function ConversationsSettingsDialog({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const boardsQuery = useLeadsBoardsQuery(workspaceId, true);
  const audioSettingQuery = useAudioLeadBoardSettingQuery(workspaceId, true);
  const saveAudioBoard = useSaveAudioLeadBoardSettingMutation(workspaceId);
  const toggleCallAutofill = useCallAutofillMutation(workspaceId);

  const boards = boardsQuery.data ?? [];
  const [boardId, setBoardId] = useState("");
  const [autofillBoardId, setAutofillBoardId] = useState("");
  const [columnId, setColumnId] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const columnsQuery = useLeadsBoardColumnsQuery(boardId || null);
  const columns = columnsQuery.data ?? [];

  const autofillBoard = boards.find((b) => b.id === autofillBoardId);

  useEffect(() => {
    if (initialized || boardsQuery.isLoading || audioSettingQuery.isLoading || boards.length === 0) return;
    const initialBoard = audioSettingQuery.data?.pipeline_id || boards[0]?.id || "";
    setBoardId(initialBoard);
    setAutofillBoardId(initialBoard);
    setColumnId(audioSettingQuery.data?.stage_id || "");
    setInitialized(true);
  }, [
    initialized,
    boards,
    boardsQuery.isLoading,
    audioSettingQuery.isLoading,
    audioSettingQuery.data?.pipeline_id,
    audioSettingQuery.data?.stage_id,
  ]);

  useEffect(() => {
    if (!initialized || columnsQuery.isLoading) return;
    if (!columnId && columns.length > 0) {
      setColumnId(columns[0]!.id);
    } else if (columnId && columns.length > 0 && !columns.some((c) => c.id === columnId)) {
      setColumnId(columns[0]!.id);
    }
  }, [initialized, columns, columnId, columnsQuery.isLoading]);

  const loading = boardsQuery.isLoading || audioSettingQuery.isLoading;
  const loadError = boardsQuery.error ?? audioSettingQuery.error;

  async function handleSaveAudioBoard() {
    if (!boardId || !columnId || saveAudioBoard.isPending) return;
    setSaveError(null);
    try {
      await saveAudioBoard.mutateAsync({ pipelineId: boardId, stageId: columnId });
      onClose();
    } catch (err) {
      setSaveError(settingsErrorMessage(err));
    }
  }

  async function handleToggleCallAutofill(enabled: boolean) {
    if (!autofillBoardId || toggleCallAutofill.isPending) return;
    setAutofillError(null);
    try {
      await toggleCallAutofill.mutateAsync({ boardId: autofillBoardId, enabled });
    } catch (err) {
      setAutofillError(settingsErrorMessage(err));
    }
  }

  const boardOptions = boards.map((b) => ({ id: b.id, label: b.name }));
  const columnOptions = columns.map((c) => ({ id: c.id, label: c.name }));

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Conversation settings</Modal.Heading>
              <p className="text-sm text-foreground/60">
                Configure how call recordings create leads and update CRM fields.
              </p>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-6 overflow-y-auto">
              {loading ? (
                <LoadingState label="Loading settings…" />
              ) : loadError ? (
                <ErrorState
                  error={loadError}
                  onRetry={() => {
                    void boardsQuery.refetch();
                    void audioSettingQuery.refetch();
                  }}
                />
              ) : boards.length === 0 ? (
                <p className="text-sm text-foreground/60">Create a leads board first to configure these options.</p>
              ) : (
                <>
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Default board for audio-created leads</h3>
                      <p className="mt-1 text-sm text-foreground/60">
                        When the mobile app uploads a call recording for a phone number with no matching lead, new leads
                        land on this board and stage.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Label className="flex flex-col gap-1.5 text-sm">
                        Board
                        <Select
                          aria-label="Board for audio-created leads"
                          value={boardId}
                          onChange={(key) => typeof key === "string" && setBoardId(key)}
                          variant="secondary"
                          isDisabled={saveAudioBoard.isPending}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox items={boardOptions}>
                              {(opt) => (
                                <ListBox.Item id={opt.id} textValue={opt.label}>
                                  {opt.label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              )}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </Label>

                      <Label className="flex flex-col gap-1.5 text-sm">
                        Stage
                        <Select
                          aria-label="Stage for audio-created leads"
                          value={columnId}
                          onChange={(key) => typeof key === "string" && setColumnId(key)}
                          variant="secondary"
                          isDisabled={saveAudioBoard.isPending || columnsQuery.isLoading || columnOptions.length === 0}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox
                              items={
                                columnOptions.length > 0
                                  ? columnOptions
                                  : [{ id: "", label: "No stages" }]
                              }
                            >
                              {(opt) => (
                                <ListBox.Item id={opt.id} textValue={opt.label} isDisabled={!opt.id}>
                                  {opt.label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              )}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </Label>
                    </div>

                    <p className="text-xs text-foreground/50">
                      If unset, new leads go to the workspace&apos;s first board and stage.
                    </p>

                    {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}
                  </section>

                  <hr className="border-divider" />

                  <section className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Auto-fill from call summaries</h3>
                      <p className="mt-1 text-sm text-foreground/60">
                        After an operator talks to a client, AI fills the lead&apos;s empty custom fields from the call
                        summary. Fields that already have a value are never overwritten.
                      </p>
                    </div>

                    <Label className="flex flex-col gap-1.5 text-sm">
                      Board
                      <Select
                        aria-label="Board for call autofill"
                        value={autofillBoardId}
                        onChange={(key) => typeof key === "string" && setAutofillBoardId(key)}
                        variant="secondary"
                        isDisabled={toggleCallAutofill.isPending}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox items={boardOptions}>
                            {(opt) => (
                              <ListBox.Item id={opt.id} textValue={opt.label}>
                                {opt.label}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            )}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </Label>

                    <label className="flex items-start justify-between gap-4">
                      <span className="min-w-0 text-sm text-foreground/60">
                        Enable for <span className="font-medium text-foreground">{autofillBoard?.name ?? "this board"}</span>
                      </span>
                      <Switch
                        isSelected={!!autofillBoard?.ai_autofill_custom_fields_from_calls}
                        isDisabled={!autofillBoardId || toggleCallAutofill.isPending || boardsQuery.isFetching}
                        onChange={(enabled) => void handleToggleCallAutofill(enabled)}
                        aria-label="Auto-fill empty custom fields from call summaries"
                      >
                        <Switch.Content>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                    </label>

                    {autofillError ? <p className="text-sm text-danger">{autofillError}</p> : null}
                  </section>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={saveAudioBoard.isPending}>
                Cancel
              </Button>
              <Button
                onPress={() => void handleSaveAudioBoard()}
                isDisabled={loading || !boardId || !columnId || saveAudioBoard.isPending}
              >
                {saveAudioBoard.isPending ? "Saving…" : "Save"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
