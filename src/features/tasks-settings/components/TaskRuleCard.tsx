"use client";

import { useMemo } from "react";
import { Button, Input, Label, ListBox, Select, Switch, TextField } from "@heroui/react";
import { TrashBin } from "@gravity-ui/icons";

import type { LeadsColumnWithBoard } from "@/features/leads-boards/hooks/useLeadsBoards";
import {
  ACTION_LABELS,
  DUE_PRESET_LABELS,
  TASK_DUE_PRESETS,
  TASK_RULE_ACTIONS,
  TASK_RULE_TRIGGERS,
  TASK_TYPE_LABELS,
  TASK_RULE_TYPES,
  TRIGGER_LABELS,
  defaultTitleForTrigger,
  type TaskRule,
  type TaskRuleAction,
  type TaskRuleTrigger,
  type TaskDuePreset,
} from "@/features/tasks-settings/types";

export function TaskRuleCard({
  rule,
  index,
  columns,
  onChange,
  onDelete,
}: {
  rule: TaskRule;
  index: number;
  columns: LeadsColumnWithBoard[];
  onChange: (patch: Partial<TaskRule>) => void;
  onDelete: () => void;
}) {
  const showColumns = rule.trigger === "lead_column_change";
  const allColumnsSelected = rule.column_ids.length === 0;

  const columnLabel = useMemo(
    () => (allColumnsSelected ? "All columns" : `${rule.column_ids.length} column${rule.column_ids.length === 1 ? "" : "s"} selected`),
    [allColumnsSelected, rule.column_ids.length],
  );

  function toggleColumn(columnId: string) {
    const current = rule.column_ids;
    let next: string[];
    if (current.length === 0) {
      next = columns.map((c) => c.id).filter((id) => id !== columnId);
    } else if (current.includes(columnId)) {
      next = current.filter((id) => id !== columnId);
    } else {
      next = [...current, columnId];
    }
    onChange({ column_ids: next });
  }

  function onTriggerChange(trigger: TaskRuleTrigger) {
    onChange({ trigger, column_ids: trigger === "lead_column_change" ? rule.column_ids : [], title_template: defaultTitleForTrigger(trigger) });
  }

  return (
    <div className="space-y-4 rounded-lg border border-black/[0.08] bg-black/[0.015] p-4 dark:border-white/[0.12] dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input value={rule.name} placeholder={`Rule ${index + 1}`} className="max-w-xs" onChange={(e) => onChange({ name: e.target.value })} />
        <div className="flex items-center gap-3">
          <Switch isSelected={rule.enabled} onChange={(enabled) => onChange({ enabled })} aria-label="Rule enabled">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
          <Button size="sm" variant="ghost" isIconOnly aria-label="Delete rule" onPress={onDelete}>
            <TrashBin className="size-4 text-danger" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select aria-label="Trigger" value={rule.trigger} onChange={(key) => typeof key === "string" && onTriggerChange(key as TaskRuleTrigger)}>
          <Label>When</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={TASK_RULE_TRIGGERS.map((t) => ({ id: t, label: TRIGGER_LABELS[t] }))}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select aria-label="Action" value={rule.action} onChange={(key) => typeof key === "string" && onChange({ action: key as TaskRuleAction })}>
          <Label>Then</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={TASK_RULE_ACTIONS.map((a) => ({ id: a, label: ACTION_LABELS[a] }))}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {showColumns ? (
        <div className="space-y-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.08]">
          <p className="text-xs font-medium text-foreground/70">Limit to columns ({columnLabel})</p>
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {columns.map((col) => {
              const active = allColumnsSelected || rule.column_ids.includes(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleColumn(col.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-black/[0.08] text-foreground/60 hover:bg-black/[0.03] dark:border-white/[0.12]"
                  }`}
                >
                  {col.name}
                </button>
              );
            })}
            {columns.length === 0 ? <p className="text-xs text-foreground/40">No columns yet.</p> : null}
          </div>
          {!allColumnsSelected ? (
            <button type="button" className="text-xs text-foreground/50 underline hover:text-foreground" onClick={() => onChange({ column_ids: [] })}>
              Reset to all columns
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 border-t border-black/[0.06] pt-3 sm:grid-cols-2 dark:border-white/[0.08]">
        <Select aria-label="Task type" value={rule.task_type} onChange={(key) => typeof key === "string" && onChange({ task_type: key })}>
          <Label>Task type</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={TASK_RULE_TYPES.map((t) => ({ id: t, label: TASK_TYPE_LABELS[t] ?? t }))}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select aria-label="Due" value={rule.due_preset} onChange={(key) => typeof key === "string" && onChange({ due_preset: key as TaskDuePreset })}>
          <Label>Due</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={TASK_DUE_PRESETS.map((p) => ({ id: p, label: DUE_PRESET_LABELS[p] }))}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <TextField>
        <Label>Title template</Label>
        <Input value={rule.title_template} className="font-mono" onChange={(e) => onChange({ title_template: e.target.value })} />
        <p className="text-xs text-foreground/50">Use {"{lead_name}"} and {"{column_name}"} as placeholders.</p>
      </TextField>
    </div>
  );
}
