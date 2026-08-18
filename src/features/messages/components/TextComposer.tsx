"use client";

import { useState } from "react";
import { Button, TextArea } from "@heroui/react";
import { ArrowUp } from "@gravity-ui/icons";

export interface TextComposerProps {
  onSend: (text: string) => void;
  isSending: boolean;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
}

/** Plain text composer shared by Telegram/Instagram/Team Chat panels (SMS
 * has its own `SmsComposer` — Eskiz sends require picking an approved
 * template, a real backend constraint, not a UI choice). Guards
 * empty/whitespace-only sends and double-submit while a send is
 * in-flight, per this project's network-flood-prevention rule. */
export function TextComposer({ onSend, isSending, disabled, disabledReason, placeholder }: TextComposerProps) {
  const [value, setValue] = useState("");
  const canSend = Boolean(value.trim()) && !isSending && !disabled;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isSending || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-black/[0.06] p-3 dark:border-white/10">
      {disabled && disabledReason ? <p className="mb-2 text-xs text-foreground/50">{disabledReason}</p> : null}
      <div className="flex items-end gap-2">
        <TextArea
          aria-label="Message"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Type a message…"}
          variant="secondary"
          rows={2}
          fullWidth
          disabled={disabled}
          className="resize-none"
        />
        <Button isIconOnly isDisabled={!canSend} onPress={handleSubmit} aria-label="Send message">
          <ArrowUp className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
