"use client";

import { useState } from "react";
import { Button, Chip, ListBox, Select, TextArea } from "@heroui/react";
import { ArrowUp, Paperclip, Square, Target, Xmark } from "@gravity-ui/icons";

import { IconButton } from "@/components/ui/IconButton";
import { AttachLeadDialog } from "@/features/chat/components/AttachLeadDialog";
import type { LeadSearchResult } from "@/services/api/leadSearch";

import type { ChatModelId, ChatModelOverride } from "@/features/chat/types";

const DEFAULT_MODEL_OPTIONS: Array<{ id: ChatModelId; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "claude-sonnet", label: "Claude Sonnet" },
  { id: "claude-opus", label: "Claude Opus" },
  { id: "gemini", label: "Gemini" },
  { id: "local", label: "Local" },
];

export interface ChatComposerProps {
  onSend: (query: string) => void;
  onStop: () => void;
  isSending: boolean;
  disabled?: boolean;
  disabledReason?: string;
  model: ChatModelId;
  onModelChange: (model: ChatModelId) => void;
  allowedModels?: ChatModelOverride[];
}

/** Adapted from the HeroUI Pro template's `chat-composer.tsx` (PromptInput
 * pattern) but rebuilt on `@heroui/react` OSS primitives (`TextArea` +
 * `Select` + `Button`) since `@heroui-pro/react`'s `PromptInput` isn't
 * usable at runtime here — see PROGRESS.md. Guards against empty/
 * whitespace-only submits and double-submit (disabled while a send is
 * in-flight), per the project's network-flood-prevention rules. */
export function ChatComposer({
  onSend,
  onStop,
  isSending,
  disabled,
  disabledReason,
  model,
  onModelChange,
  allowedModels,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [attachedLead, setAttachedLead] = useState<LeadSearchResult | null>(null);
  const [showLeadPicker, setShowLeadPicker] = useState(false);

  const modelOptions =
    allowedModels && allowedModels.length > 0
      ? allowedModels.map((m) => ({ id: m.id as ChatModelId, label: m.label ?? m.name ?? m.id }))
      : DEFAULT_MODEL_OPTIONS;

  const canSend = Boolean(value.trim()) && !isSending && !disabled;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isSending || disabled) return;
    // Old frontend's exact convention (`buildMessageWithContext()` in
    // `Dashboard.tsx`, read for reference): prepend a plain-text context
    // line the model can read, rather than a structured field the backend
    // doesn't accept — `/ai-chat/v2` takes a single message string, no
    // separate "context" parameter exists to trace.
    const query = attachedLead
      ? `[Lead context: ${attachedLead.name} (id: ${attachedLead.id})]\n${trimmed}`
      : trimmed;
    onSend(query);
    setValue("");
    setAttachedLead(null); // matches the old app's own clear-after-send behavior
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[714px] flex-col gap-2 p-3">
      {disabled && disabledReason ? (
        <p className="text-xs text-foreground/50">{disabledReason}</p>
      ) : null}
      {attachedLead ? (
        <div className="flex">
          <Chip size="sm" variant="soft" color="accent">
            <Chip.Label className="flex items-center gap-1.5">
              Lead: {attachedLead.name}
              <button
                type="button"
                aria-label="Remove attached lead"
                onClick={() => setAttachedLead(null)}
                className="rounded-full hover:opacity-70"
              >
                <Xmark className="size-3" aria-hidden="true" />
              </button>
            </Chip.Label>
          </Chip>
        </div>
      ) : null}
      {/* Floating input — transparent fill, held together by the shadow/
          border alone so it reads as sitting over the page rather than a
          solid docked bar. */}
      <div className="flex flex-col gap-2 rounded-2xl border border-black/[0.08] bg-transparent p-2 shadow-md backdrop-blur-md dark:border-white/10">
        <TextArea
          aria-label="Message"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          variant="secondary"
          rows={2}
          fullWidth
          disabled={disabled}
          className="resize-none border-none bg-transparent shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {/* Not wired up — the old app's file-attach flow feeds into the
                generated-media/image-editing pipeline, whose upload
                endpoint was explicitly untraced and left out of scope (see
                PROGRESS.md). Shown disabled rather than guessing an
                endpoint, same pattern as the sidebar's notification bell. */}
            <IconButton
              label="Attach a file"
              tooltip="Attachments coming soon"
              variant="ghost"
              size="sm"
              isDisabled
            >
              <Paperclip className="size-4" aria-hidden="true" />
            </IconButton>

            <IconButton
              label="Attach a lead"
              tooltip={attachedLead ? "Change attached lead" : "Attach a lead for context"}
              variant="ghost"
              size="sm"
              isDisabled={disabled}
              onPress={() => setShowLeadPicker(true)}
            >
              <Target className="size-4" aria-hidden="true" />
            </IconButton>

            <Select
              aria-label="Model"
              value={model}
              onChange={(key) => {
                if (typeof key === "string") onModelChange(key as ChatModelId);
              }}
              isDisabled={isSending || disabled}
              variant="secondary"
              className="w-40"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                {/* React Aria's "dynamic collection" API (`items` + render-prop
                    child) — using a plain `.map()` of JSX here (the "static
                    collection" form, meant for hardcoded fixed items) is what
                    triggered the "missing key" warning, since RAC builds its
                    off-screen Collection separately from normal React
                    reconciliation and doesn't reliably pick up a `key` from
                    mapped JSX for a data-driven list. */}
                <ListBox items={modelOptions}>
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

          {isSending ? (
            <IconButton label="Stop generating" tooltip="Stop" variant="danger" size="sm" onPress={onStop}>
              <Square className="size-4" aria-hidden="true" />
            </IconButton>
          ) : (
            <Button isIconOnly size="sm" isDisabled={!canSend} onPress={handleSubmit} aria-label="Send message" data-testid="chat-send">
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-center text-[11px] text-foreground/40">AI can make mistakes. Verify important information.</p>

      {showLeadPicker ? (
        <AttachLeadDialog
          onSelect={setAttachedLead}
          onClose={() => setShowLeadPicker(false)}
        />
      ) : null}
    </div>
  );
}
