"use client";

import { useState } from "react";
import { Button, TextArea } from "@heroui/react";
import { ArrowUp, Xmark } from "@gravity-ui/icons";

import type { CannedResponseRow } from "@/features/canned-responses/types";
import { CannedResponsesMenu } from "@/features/messages/components/CannedResponsesMenu";
import { matchCannedPrefix, resolveCannedShortcut } from "@/features/messages/lib/cannedResponses";

export interface TextComposerProps {
  onSend: (text: string) => void;
  isSending: boolean;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
  /** Prefills the textarea — used to seed the draft with the message being
   * edited. Pass a `key` on the composer from the caller when this changes
   * (e.g. `key={editingId ?? "new"}`) so it actually remounts/resets. */
  initialValue?: string;
  /** Reply/edit context strip shown above the textarea, with a cancel (X)
   * button — mirrors the old frontend's reply-preview/edit-preview bar. */
  contextBanner?: { label: string; text: string; onCancel: () => void } | null;
  /** Overrides the send button's icon-only default with a text label
   * (used while editing, to make "Save" vs "Send" unambiguous). */
  submitLabel?: string;
  /** Active canned responses for `/shortcut` expansion and autocomplete. */
  cannedResponses?: CannedResponseRow[];
}

/** Plain text composer shared by Telegram/Instagram/Team Chat panels (SMS
 * has its own `SmsComposer` — Eskiz sends require picking an approved
 * template, a real backend constraint, not a UI choice). Guards
 * empty/whitespace-only sends and double-submit while a send is
 * in-flight, per this project's network-flood-prevention rule. */
export function TextComposer({ onSend, isSending, disabled, disabledReason, placeholder, initialValue, contextBanner, submitLabel, cannedResponses = [] }: TextComposerProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const canSend = Boolean(value.trim()) && !isSending && !disabled;
  const showCannedMenu = cannedResponses.length > 0 && value.startsWith("/") && matchCannedPrefix(value, cannedResponses).length > 0;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isSending || disabled) return;
    const resolved = cannedResponses.length ? resolveCannedShortcut(trimmed, cannedResponses) : null;
    onSend(resolved ?? trimmed);
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
      {contextBanner ? (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg bg-[var(--default)] px-2.5 py-1.5 text-xs">
          <div className="min-w-0">
            <p className="font-medium text-foreground/70">{contextBanner.label}</p>
            <p className="truncate text-foreground/50">{contextBanner.text}</p>
          </div>
          <button
            type="button"
            onClick={contextBanner.onCancel}
            aria-label="Cancel"
            className="shrink-0 text-foreground/40 hover:text-foreground"
          >
            <Xmark className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {showCannedMenu ? (
        <CannedResponsesMenu
          draft={value}
          responses={cannedResponses}
          onPick={(body) => {
            setValue(body);
          }}
          className="mb-2"
        />
      ) : null}
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
        {submitLabel ? (
          <Button isDisabled={!canSend} onPress={handleSubmit}>
            {submitLabel}
          </Button>
        ) : (
          <Button isIconOnly isDisabled={!canSend} onPress={handleSubmit} aria-label="Send message">
            <ArrowUp className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
