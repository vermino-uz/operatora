"use client";

import { useState, type ChangeEvent } from "react";
import { Button, Input, Label, ListBox, Modal, Select, TextField } from "@heroui/react";

import { useDebounce } from "@/hooks/useDebounce";
import { useLeadSearchQuery } from "@/features/leads/hooks/useLeadSearch";
import { useCreateTaskMutation } from "@/features/tasks/hooks/useTaskMutations";
import { useTaskAssigneesQuery } from "@/features/tasks/hooks/useTasksQuery";
import {
  CREATABLE_TASK_TYPES,
  dueFromPreset,
  taskTypeLabel,
  type OperatorTask,
  type TaskDuePreset,
} from "@/features/tasks/types";

const DUE_PRESETS: { key: TaskDuePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "in_3_days", label: "In 3 days" },
  { key: "custom", label: "Custom" },
];

/**
 * `POST /tasks` — reference: old frontend's `components/tasks/
 * CreateTaskDialog.tsx`. `canAssign` hides the assignee picker entirely for
 * non-managers (server would 403 a non-manager assigning to someone else —
 * this just avoids offering a control that would always fail).
 */
export function CreateTaskDialog({
  canAssign,
  onClose,
  onCreated,
}: {
  canAssign: boolean;
  onClose: () => void;
  onCreated: (task: OperatorTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<string>("call");
  const [duePreset, setDuePreset] = useState<TaskDuePreset>("tomorrow");
  const [customDue, setCustomDue] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("self");
  const [leadQuery, setLeadQuery] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);

  const debouncedLeadQuery = useDebounce(leadQuery, 300);
  const assigneesQuery = useTaskAssigneesQuery(canAssign);
  const leadSearchQuery = useLeadSearchQuery(debouncedLeadQuery, debouncedLeadQuery.trim().length >= 2 && !leadId);

  const assignees = assigneesQuery.data ?? [];
  const selectedAssignee = assignees.find((a) => a.id === assigneeId);

  const createTask = useCreateTaskMutation();

  // Custom due input is only meaningful once "Custom" is picked — cleared
  // directly in the preset-button handler below (not a `useEffect`, so a
  // stale value never lingers if the operator switches away and back)
  // rather than submitted silently under a different preset.
  const selectDuePreset = (preset: TaskDuePreset) => {
    setDuePreset(preset);
    if (preset !== "custom") setCustomDue("");
  };

  const submit = async () => {
    if (createTask.isPending || !title.trim()) return;
    if (duePreset === "custom" && !customDue) return;
    const due_at = dueFromPreset(duePreset, customDue);
    try {
      const task = await createTask.mutateAsync({
        title: title.trim(),
        task_type: taskType,
        due_at,
        lead_id: leadId,
        ...(canAssign && assigneeId !== "self"
          ? { assigned_operator_id: assigneeId, assigned_to: selectedAssignee?.profile_id ?? null }
          : {}),
      });
      onCreated(task);
    } catch {
      // error surfaced inline below
    }
  };

  const canSubmit = title.trim().length > 0 && !(duePreset === "custom" && !customDue) && !createTask.isPending;

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>New task</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <TextField>
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder="e.g. Call back about pricing"
                />
              </TextField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select aria-label="Task type" value={taskType} onChange={(key) => typeof key === "string" && setTaskType(key)}>
                  <Label>Type</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={CREATABLE_TASK_TYPES.map((t) => ({ id: t, label: taskTypeLabel(t) }))}>
                      {(opt) => (
                        <ListBox.Item id={opt.id} textValue={opt.label}>
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>

                {canAssign ? (
                  <Select
                    aria-label="Assignee"
                    value={assigneeId}
                    onChange={(key) => typeof key === "string" && setAssigneeId(key)}
                  >
                    <Label>Assignee</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox
                        items={[
                          { id: "self", label: "Myself" },
                          ...assignees.map((a) => ({ id: a.id, label: a.operator_name || a.id.slice(0, 8) })),
                        ]}
                      >
                        {(opt) => (
                          <ListBox.Item id={opt.id} textValue={opt.label}>
                            {opt.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Due</Label>
                <div className="flex flex-wrap gap-2">
                  {DUE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => selectDuePreset(p.key)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        duePreset === p.key
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-black/[0.12] text-foreground/70 hover:bg-black/[0.04] dark:border-white/[0.16] dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {duePreset === "custom" ? (
                  <Input
                    type="datetime-local"
                    value={customDue}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomDue(e.target.value)}
                  />
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Lead (optional)</Label>
                <Input
                  value={leadQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setLeadQuery(e.target.value);
                    setLeadId(null);
                  }}
                  placeholder="Search by name or phone…"
                />
                {leadId ? (
                  <p className="text-xs text-foreground/60">Linked to selected lead.</p>
                ) : debouncedLeadQuery.trim().length >= 2 ? (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-black/[0.08] dark:border-white/[0.12]">
                    {leadSearchQuery.isLoading ? (
                      <p className="px-3 py-2 text-xs text-foreground/50">Searching…</p>
                    ) : (leadSearchQuery.data ?? []).length === 0 ? (
                      <p className="px-3 py-2 text-xs text-foreground/50">No leads found.</p>
                    ) : (
                      (leadSearchQuery.data ?? []).map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => {
                            setLeadId(result.id);
                            setLeadQuery(result.name);
                          }}
                          className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        >
                          {result.name}
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              {createTask.isError ? (
                <p role="alert" className="text-sm text-danger">
                  Couldn&apos;t create the task. Please try again.
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
              <Button variant="primary" isDisabled={!canSubmit} onPress={submit}>
                {createTask.isPending ? "Creating…" : "Create task"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
