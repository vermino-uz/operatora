"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, TextArea } from "@heroui/react";
import { ArrowUp, Microphone as Mic, Paperclip, TrashBin, Xmark } from "@gravity-ui/icons";

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
  /** Popup panels anchored above the composer (sticker picker, etc.). */
  toolbarStart?: ReactNode;
  /** Icon buttons to the left of the textarea (e.g. stickers). */
  leadingActions?: ReactNode;
  /** Send a picked or pasted file (photo, video, document, etc.). */
  onFileSelect?: (file: File) => void;
  accept?: string;
  /** Record and send an Ogg Opus voice note (Telegram inbox). */
  onVoiceRecord?: (file: File) => void;
}

type RecState = "idle" | "starting" | "recording" | "finishing";

interface OpusRecorderInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
  close(): Promise<void> | void;
  ondataavailable: (data: Uint8Array) => void;
  onstop: () => void;
}

interface OpusRecorderCtor {
  new (config: Record<string, unknown>): OpusRecorderInstance;
  isRecordingSupported(): boolean;
}

function formatTimer(seconds: number) {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Plain text composer shared by Telegram/Instagram/Team Chat panels (SMS
 * has its own `SmsComposer` — Eskiz sends require picking an approved
 * template, a real backend constraint, not a UI choice). Guards
 * empty/whitespace-only sends and double-submit while a send is
 * in-flight, per this project's network-flood-prevention rule. */
export function TextComposer({
  onSend,
  isSending,
  disabled,
  disabledReason,
  placeholder,
  initialValue,
  contextBanner,
  submitLabel,
  cannedResponses = [],
  toolbarStart,
  leadingActions,
  onFileSelect,
  accept = "*/*",
  onVoiceRecord,
}: TextComposerProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<OpusRecorderInstance | null>(null);
  const cancelRef = useRef(false);
  const [recState, setRecState] = useState<RecState>("idle");
  const [recSeconds, setRecSeconds] = useState(0);

  const canSend = Boolean(value.trim()) && !isSending && !disabled;
  const isRecording = recState !== "idle";
  const showCannedMenu =
    !isRecording && cannedResponses.length > 0 && value.startsWith("/") && matchCannedPrefix(value, cannedResponses).length > 0;

  useEffect(() => {
    if (recState !== "recording") return;
    const timer = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recState]);

  useEffect(() => {
    return () => {
      const rec = recorderRef.current;
      if (!rec) return;
      cancelRef.current = true;
      void rec.stop().catch(() => undefined);
    };
  }, []);

  async function startRecording() {
    if (!onVoiceRecord || recState !== "idle" || disabled || isSending) return;
    setRecState("starting");
    setRecSeconds(0);
    cancelRef.current = false;
    try {
      const mod = await import("opus-recorder");
      const Recorder = mod.default as OpusRecorderCtor;
      if (!Recorder.isRecordingSupported()) {
        throw new Error("Voice recording is not supported in this browser.");
      }
      const rec = new Recorder({
        encoderPath: "/encoderWorker.min.js",
        numberOfChannels: 1,
        encoderSampleRate: 48000,
        encoderApplication: 2048,
      });
      rec.ondataavailable = (typedArray) => {
        if (cancelRef.current) return;
        const buffer = typedArray.buffer.slice(
          typedArray.byteOffset,
          typedArray.byteOffset + typedArray.byteLength,
        ) as ArrayBuffer;
        const blob = new Blob([buffer], { type: "audio/ogg" });
        const file = new File([blob], `voice-${Date.now()}.ogg`, { type: "audio/ogg" });
        onVoiceRecord(file);
      };
      rec.onstop = () => {
        void rec.close();
        recorderRef.current = null;
        setRecState("idle");
        setRecSeconds(0);
      };
      recorderRef.current = rec;
      await rec.start();
      setRecState("recording");
    } catch (err) {
      recorderRef.current = null;
      setRecState("idle");
      setRecSeconds(0);
      const msg =
        err instanceof Error && err.message.toLowerCase().includes("permission")
          ? "Microphone access was denied."
          : err instanceof Error
            ? err.message
            : "Failed to start recording.";
      alert(msg);
    }
  }

  async function stopAndSend() {
    const rec = recorderRef.current;
    if (!rec || recState !== "recording") return;
    setRecState("finishing");
    cancelRef.current = false;
    try {
      await rec.stop();
    } catch {
      setRecState("idle");
    }
  }

  async function cancelRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    cancelRef.current = true;
    try {
      await rec.stop();
    } catch {
      /* ignore */
    }
  }

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

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (disabled || !onFileSelect || isRecording) return;
    const items = e.clipboardData?.items;
    if (!items?.length) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;
      e.preventDefault();
      const ext = item.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const named =
        file.name && !/^image\.\w+$/i.test(file.name)
          ? file
          : new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type });
      onFileSelect(named);
      return;
    }
  }

  const recStatusLabel =
    recState === "starting" ? "Connecting…" : recState === "finishing" ? "Finishing…" : "Recording";

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
      <div className="relative">
        {!isRecording ? toolbarStart : null}
        {!isRecording ? (
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onFileSelect) onFileSelect(file);
              e.target.value = "";
            }}
          />
        ) : null}
        {isRecording ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void cancelRecording()}
              aria-label="Cancel recording"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger/10"
            >
              <TrashBin className="size-[18px]" aria-hidden="true" />
            </button>
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-danger/20 bg-danger/5 px-4">
              <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden="true" />
              <span className="tabular-nums text-sm font-medium text-foreground">{formatTimer(recSeconds)}</span>
              <span className="truncate text-xs text-foreground/55">{recStatusLabel}</span>
            </div>
            <Button
              isIconOnly
              isDisabled={recState !== "recording"}
              onPress={() => void stopAndSend()}
              aria-label="Send voice message"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {onFileSelect ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isSending}
                aria-label="Attach file"
                className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-[var(--default)] hover:text-foreground disabled:opacity-40"
              >
                <Paperclip className="size-[18px]" aria-hidden="true" />
              </button>
            ) : null}
            {leadingActions}
            <TextArea
              aria-label="Message"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
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
            ) : onVoiceRecord && !value.trim() ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={disabled || isSending}
                aria-label="Record voice message"
                className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--default)] text-foreground/55 transition-colors hover:text-foreground disabled:opacity-40"
              >
                <Mic className="size-[18px]" aria-hidden="true" />
              </button>
            ) : (
              <Button isIconOnly isDisabled={!canSend} onPress={handleSubmit} aria-label="Send message">
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
