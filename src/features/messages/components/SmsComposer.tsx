"use client";

import { useState } from "react";
import { Button, Input, Label, ListBox, Select, TextArea, TextField } from "@heroui/react";
import { ArrowUp } from "@gravity-ui/icons";

import type { EskizTemplate } from "@/features/leads/types";

export interface SmsComposerProps {
  templates: EskizTemplate[];
  onSend: (payload: { templateId: string; text?: string }) => void;
  isSending: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

/** SMS's composer is real-but-different from the plain-text channels: Eskiz
 * (Uzbekistan's SMS gateway regulator requirement) only sends pre-approved,
 * moderated templates — a free-text box would 400 against the real
 * backend. Mirrors the constraint already established and documented in
 * `eskizSmsApi.send`'s own doc comment (Phase 2c-8). The optional `text`
 * override lets an operator substitute the approved template's body (e.g.
 * a name/date) as long as the structure still matches — same real
 * constraint, surfaced honestly as an optional field rather than a full
 * free-text box. */
export function SmsComposer({ templates, onSend, isSending, disabled, disabledReason }: SmsComposerProps) {
  const approved = templates.filter((t) => t.status === "approved");
  const [templateId, setTemplateId] = useState<string>(approved[0]?.id ?? "");
  const [override, setOverride] = useState("");

  const canSend = Boolean(templateId) && !isSending && !disabled;

  function handleSubmit() {
    if (!templateId || isSending || disabled) return;
    onSend({ templateId, text: override.trim() || undefined });
    setOverride("");
  }

  if (approved.length === 0) {
    return (
      <div className="border-t border-black/[0.06] p-3 text-xs text-foreground/50 dark:border-white/10">
        No approved SMS templates yet. Add and get one approved in Settings → Eskiz before replying.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-black/[0.06] p-3 dark:border-white/10">
      {disabled && disabledReason ? <p className="text-xs text-foreground/50">{disabledReason}</p> : null}
      <TextField>
        <Label>Template</Label>
        <Select aria-label="SMS template" value={templateId} onChange={(key) => typeof key === "string" && setTemplateId(key)} variant="secondary" isDisabled={disabled}>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={approved.map((t) => ({ id: t.id, label: t.content }))}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  <span className="line-clamp-2">{opt.label}</span>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </TextField>
      <div className="flex items-end gap-2">
        <TextArea
          aria-label="Override text (optional)"
          value={override}
          onChange={(e) => setOverride(e.target.value)}
          placeholder="Optional: override text (must match the template's structure)…"
          variant="secondary"
          rows={2}
          fullWidth
          disabled={disabled}
          className="resize-none"
        />
        <Button isIconOnly isDisabled={!canSend} onPress={handleSubmit} aria-label="Send SMS">
          <ArrowUp className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function NewSmsPhoneField({ onStart }: { onStart: (phone: string) => void }) {
  const [phone, setPhone] = useState("");
  return (
    <div className="flex items-center gap-2 p-3">
      <Input aria-label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998…" fullWidth />
      <Button size="sm" isDisabled={!phone.trim()} onPress={() => onStart(phone.trim())}>
        New
      </Button>
    </div>
  );
}
