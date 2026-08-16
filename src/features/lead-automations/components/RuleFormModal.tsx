"use client";

import { useState } from "react";
import { Button, Input, Label, ListBox, Modal, Select, Switch, TextArea, TextField } from "@heroui/react";
import { Plus, TrashBin } from "@gravity-ui/icons";

import type {
  ActionDraft,
  ActionType,
  ColumnOption,
  FormState,
  OperatorOption,
  TagOption,
  TriggerDraft,
  TriggerType,
} from "@/features/lead-automations/types";
import { ACTION_TYPE_LABELS, EMPTY_ACTION, EMPTY_TRIGGER, FIELD_OPTIONS, TRIGGER_TYPE_LABELS, validateForm } from "@/features/lead-automations/types";

function selectField<T extends string>(opts: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select aria-label={opts.label} value={opts.value} onChange={(key) => typeof key === "string" && opts.onChange(key as T)}>
      <Label>{opts.label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={opts.options.map((o) => ({ id: o.value, label: o.label }))}>
          {(opt) => (
            <ListBox.Item id={opt.id} textValue={opt.label}>
              {opt.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function TriggerRow({
  trigger,
  index,
  columns,
  triggerFieldOptions,
  canRemove,
  onChange,
  onRemove,
}: {
  trigger: TriggerDraft;
  index: number;
  columns: ColumnOption[];
  triggerFieldOptions: { value: string; label: string }[];
  canRemove: boolean;
  onChange: (patch: Partial<TriggerDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {selectField({
            label: `Trigger ${index + 1}`,
            value: trigger.type,
            onChange: (v: TriggerType) => onChange({ type: v }),
            options: (Object.keys(TRIGGER_TYPE_LABELS) as TriggerType[]).map((t) => ({ value: t, label: TRIGGER_TYPE_LABELS[t] })),
          })}
        </div>
        {canRemove ? (
          <Button size="sm" variant="ghost" isIconOnly aria-label="Remove trigger" className="mt-5" onPress={onRemove}>
            <TrashBin className="size-4 text-danger" />
          </Button>
        ) : null}
      </div>

      {trigger.type === "lead_column_change" &&
        selectField({
          label: "Column",
          value: trigger.column_id,
          onChange: (v) => onChange({ column_id: v }),
          options: [{ value: "", label: "Select a column…" }, ...columns.map((c) => ({ value: c.id, label: `${c.board_name} / ${c.name}` }))],
        })}

      {trigger.type === "lead_field_changed" && (
        <>
          {selectField({ label: "Field", value: trigger.field, onChange: (v) => onChange({ field: v }), options: triggerFieldOptions })}
          {selectField({
            label: "Condition",
            value: trigger.operator,
            onChange: (v: TriggerDraft["operator"]) => onChange({ operator: v }),
            options: [
              { value: "changed", label: "Changed" },
              { value: "set_to", label: "Set to" },
              { value: "contains", label: "Contains" },
            ],
          })}
          {trigger.operator !== "changed" ? (
            <TextField>
              <Label>Value</Label>
              <Input value={trigger.value} onChange={(e) => onChange({ value: e.target.value })} />
            </TextField>
          ) : null}
        </>
      )}

      {trigger.type === "lead_signal_threshold" && (
        <div className="grid grid-cols-2 gap-2">
          <TextField>
            <Label>Min intent %</Label>
            <Input type="number" value={trigger.min_intent_percent} onChange={(e) => onChange({ min_intent_percent: e.target.value })} placeholder="75" />
          </TextField>
          <TextField>
            <Label>Min silence days</Label>
            <Input type="number" value={trigger.min_silence_days} onChange={(e) => onChange({ min_silence_days: e.target.value })} placeholder="14" />
          </TextField>
        </div>
      )}

      {trigger.type === "schedule" && (
        <div className="grid grid-cols-2 gap-2">
          {selectField({
            label: "Frequency",
            value: trigger.schedule_frequency,
            onChange: (v: TriggerDraft["schedule_frequency"]) => onChange({ schedule_frequency: v }),
            options: [
              { value: "hourly", label: "Hourly" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
            ],
          })}
          <TextField>
            <Label>Time (HH:mm)</Label>
            <Input value={trigger.schedule_time} onChange={(e) => onChange({ schedule_time: e.target.value })} placeholder="09:00" />
          </TextField>
          {trigger.schedule_frequency === "weekly"
            ? selectField({
                label: "Weekday",
                value: trigger.schedule_weekday,
                onChange: (v) => onChange({ schedule_weekday: v }),
                options: [
                  { value: "1", label: "Mon" },
                  { value: "2", label: "Tue" },
                  { value: "3", label: "Wed" },
                  { value: "4", label: "Thu" },
                  { value: "5", label: "Fri" },
                ],
              })
            : null}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  action,
  columns,
  operators,
  tags,
  canRemove,
  onChange,
  onRemove,
}: {
  action: ActionDraft;
  columns: ColumnOption[];
  operators: OperatorOption[];
  tags: TagOption[];
  canRemove: boolean;
  onChange: (patch: Partial<ActionDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {selectField({
            label: "Action",
            value: action.type,
            onChange: (v: ActionType) => onChange({ type: v }),
            options: (Object.keys(ACTION_TYPE_LABELS) as ActionType[]).map((t) => ({ value: t, label: ACTION_TYPE_LABELS[t] })),
          })}
        </div>
        {canRemove ? (
          <Button size="sm" variant="ghost" isIconOnly aria-label="Remove action" className="mt-5" onPress={onRemove}>
            <TrashBin className="size-4 text-danger" />
          </Button>
        ) : null}
      </div>

      {action.type === "move_to_column" &&
        selectField({
          label: "Target column",
          value: action.column_id,
          onChange: (v) => onChange({ column_id: v }),
          options: [{ value: "", label: "Select a column…" }, ...columns.map((c) => ({ value: c.id, label: `${c.board_name} / ${c.name}` }))],
        })}

      {action.type === "assign_operator" &&
        selectField({
          label: "Operator",
          value: action.operator_id,
          onChange: (v) => onChange({ operator_id: v }),
          options: [{ value: "", label: "Select an operator…" }, ...operators.map((o) => ({ value: o.id, label: o.operator_name ?? o.id }))],
        })}

      {action.type === "edit_field" && (
        <>
          {selectField({ label: "Field", value: action.field, onChange: (v) => onChange({ field: v }), options: FIELD_OPTIONS })}
          <TextField>
            <Label>Value</Label>
            <Input value={action.field_value} onChange={(e) => onChange({ field_value: e.target.value })} />
          </TextField>
        </>
      )}

      {action.type === "sms_notify" && (
        <>
          {selectField({
            label: "Send to",
            value: action.sms_to,
            onChange: (v: ActionDraft["sms_to"]) => onChange({ sms_to: v }),
            options: [
              { value: "lead", label: "The lead's own phone" },
              { value: "custom", label: "A specific number" },
            ],
          })}
          {action.sms_to === "custom" ? (
            <TextField>
              <Label>Phone</Label>
              <Input value={action.sms_phone} onChange={(e) => onChange({ sms_phone: e.target.value })} placeholder="+998 90 123 45 67" />
            </TextField>
          ) : null}
          <TextField>
            <Label>Message</Label>
            <TextArea value={action.sms_message} onChange={(e) => onChange({ sms_message: e.target.value })} rows={2} />
          </TextField>
        </>
      )}

      {action.type === "notify_user" && (
        <>
          {selectField({
            label: "Notify",
            value: action.notify_target,
            onChange: (v) => onChange({ notify_target: v }),
            options: [
              { value: "assigned_operator", label: "Assigned operator" },
              { value: "assigned_to", label: "Assigned user" },
              ...operators.map((o) => ({ value: o.id, label: o.operator_name ?? o.id })),
            ],
          })}
          <TextField>
            <Label>Title</Label>
            <Input value={action.notify_title} onChange={(e) => onChange({ notify_title: e.target.value })} />
          </TextField>
          <TextField>
            <Label>Message</Label>
            <TextArea value={action.notify_message} onChange={(e) => onChange({ notify_message: e.target.value })} rows={2} />
          </TextField>
        </>
      )}

      {action.type === "send_webhook" && (
        <>
          <TextField>
            <Label>Webhook URL</Label>
            <Input value={action.webhook_url} onChange={(e) => onChange({ webhook_url: e.target.value })} placeholder="https://..." />
          </TextField>
          <TextField>
            <Label>Payload message</Label>
            <TextArea value={action.webhook_message} onChange={(e) => onChange({ webhook_message: e.target.value })} rows={2} placeholder="{{lead.name}}" />
          </TextField>
        </>
      )}

      {action.type === "telegram_notify" && (
        <>
          {selectField({
            label: "Target",
            value: action.telegram_target,
            onChange: (v) => onChange({ telegram_target: v }),
            options: [
              { value: "workspace_group", label: "Workspace Telegram (owner chat)" },
              { value: "department_group", label: "Department group (Settings → Departments)" },
              { value: "assignee", label: "The assigned operator" },
              ...operators.map((o) => ({ value: `user:${o.id}`, label: o.operator_name ?? o.id })),
            ],
          })}
          <TextField>
            <Label>Message</Label>
            <TextArea value={action.telegram_message} onChange={(e) => onChange({ telegram_message: e.target.value })} rows={2} />
          </TextField>
        </>
      )}

      {action.type === "add_tag" &&
        selectField({
          label: "Tag",
          value: action.tag_id,
          onChange: (v) => onChange({ tag_id: v }),
          options: [{ value: "", label: "Select a tag…" }, ...tags.map((t) => ({ value: t.id, label: t.name }))],
        })}

      {action.type === "add_comment" && (
        <TextField>
          <Label>Comment</Label>
          <TextArea value={action.comment_message} onChange={(e) => onChange({ comment_message: e.target.value })} rows={2} />
        </TextField>
      )}

      {action.type === "set_deadline" && (
        <TextField>
          <Label>Days from now</Label>
          <Input type="number" value={action.deadline_days} onChange={(e) => onChange({ deadline_days: e.target.value })} className="w-24" />
        </TextField>
      )}

      {action.type === "require_field" &&
        selectField({
          label: "Required field",
          value: action.required_field || "deadline",
          onChange: (v) => onChange({ required_field: v }),
          options: [{ value: "deadline", label: "Deadline" }, ...FIELD_OPTIONS],
        })}

      {action.type === "archive_lead" &&
        selectField({
          label: "Mode",
          value: action.archive_mode,
          onChange: (v: ActionDraft["archive_mode"]) => onChange({ archive_mode: v }),
          options: [
            { value: "archive", label: "Archive lead" },
            { value: "sold", label: "Mark as sold" },
          ],
        })}
    </div>
  );
}

export function RuleFormModal({
  isOpen,
  onClose,
  form,
  setForm,
  columns,
  operators,
  tags,
  isEditing,
  isSaving,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  columns: ColumnOption[];
  operators: OperatorOption[];
  tags: TagOption[];
  isEditing: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const triggerFieldOptions = FIELD_OPTIONS;

  function handleSave() {
    const err = validateForm(form);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSave();
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{isEditing ? "Edit rule" : "New automation rule"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="max-h-[70vh] space-y-5 overflow-y-auto">
              <TextField>
                <Label>Rule name</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Hot lead → notify team" />
              </TextField>
              <TextField>
                <Label>Description (optional)</Label>
                <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </TextField>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Triggers</p>
                  {selectField({
                    label: "Match",
                    value: form.trigger_mode,
                    onChange: (v: FormState["trigger_mode"]) => setForm((p) => ({ ...p, trigger_mode: v })),
                    options: [
                      { value: "any", label: "Any trigger" },
                      { value: "all", label: "All triggers" },
                    ],
                  })}
                </div>
                {form.triggers.map((tr, idx) => (
                  <TriggerRow
                    key={tr.id}
                    trigger={tr}
                    index={idx}
                    columns={columns}
                    triggerFieldOptions={triggerFieldOptions}
                    canRemove={form.triggers.length > 1}
                    onChange={(patch) => setForm((p) => ({ ...p, triggers: p.triggers.map((t, i) => (i === idx ? { ...t, ...patch } : t)) }))}
                    onRemove={() => setForm((p) => ({ ...p, triggers: p.triggers.filter((_, i) => i !== idx) }))}
                  />
                ))}
                <Button size="sm" variant="secondary" onPress={() => setForm((p) => ({ ...p, triggers: [...p.triggers, EMPTY_TRIGGER()] }))}>
                  <Plus className="size-3.5" />
                  Add trigger
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
                <p className="text-sm font-semibold">Scope (optional)</p>
                <p className="text-xs text-foreground/50">Only apply this rule to leads matching all of the below.</p>
                {selectField({
                  label: "Operator",
                  value: form.scope_operator_id,
                  onChange: (v) => setForm((p) => ({ ...p, scope_operator_id: v })),
                  options: [{ value: "", label: "Any operator" }, ...operators.map((o) => ({ value: o.id, label: o.operator_name ?? o.id }))],
                })}
                <TextField>
                  <Label>Search text</Label>
                  <Input value={form.scope_search} onChange={(e) => setForm((p) => ({ ...p, scope_search: e.target.value }))} />
                </TextField>
              </div>

              <TextField>
                <Label>Cooldown (seconds)</Label>
                <Input type="number" min={0} value={form.cooldown_seconds} onChange={(e) => setForm((p) => ({ ...p, cooldown_seconds: e.target.value }))} />
                <p className="text-xs text-foreground/50">0 fires on every matching event. Otherwise fires at most once per lead per window.</p>
              </TextField>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Actions</p>
                {form.actions.map((ac, idx) => (
                  <ActionRow
                    key={ac.id}
                    action={ac}
                    columns={columns}
                    operators={operators}
                    tags={tags}
                    canRemove={form.actions.length > 1}
                    onChange={(patch) => setForm((p) => ({ ...p, actions: p.actions.map((a, i) => (i === idx ? { ...a, ...patch } : a)) }))}
                    onRemove={() => setForm((p) => ({ ...p, actions: p.actions.filter((_, i) => i !== idx) }))}
                  />
                ))}
                <Button size="sm" variant="secondary" onPress={() => setForm((p) => ({ ...p, actions: [...p.actions, EMPTY_ACTION()] }))}>
                  <Plus className="size-3.5" />
                  Add action
                </Button>
              </div>

              <label className="flex items-center gap-2">
                <Switch isSelected={form.is_active} onChange={(is_active) => setForm((p) => ({ ...p, is_active }))} aria-label="Rule active">
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
                <span className="text-sm">Active</span>
              </label>

              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
              <Button isDisabled={isSaving} onPress={handleSave}>
                {isSaving ? "Saving…" : "Save rule"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
