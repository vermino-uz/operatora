"use client";

import { useState } from "react";
import { Button, Spinner } from "@heroui/react";
import {
  ArrowDownToLine,
  CircleExclamation,
  CirclePlayFill,
  ForwardStep,
  Pause,
  Play,
  Volume,
  VolumeXmark,
} from "@gravity-ui/icons";

import { useGlobalAudio } from "@/features/audio/GlobalAudioProvider";
import { getConversationAudioBlob } from "@/services/api/conversations";
import { ApiError } from "@/types/api";

export interface ConversationInlineAudioPlayerProps {
  conversationId: string;
  hasAudio: boolean;
  fileName?: string;
  title?: string;
  subtitle?: string;
  durationFallback?: string | null;
}

/** Inline audio card in the detail panel — drives the global player but
 * keeps transport controls visible in context (old UI parity). */
export function ConversationInlineAudioPlayer({
  conversationId,
  hasAudio,
  fileName = "recording",
  title,
  subtitle,
  durationFallback,
}: ConversationInlineAudioPlayerProps) {
  const global = useGlobalAudio();
  const [isDownloading, setIsDownloading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const isThis = global.conversationId === conversationId;
  const isPlaying = isThis && global.isPlaying;
  const isPaused = isThis && !global.isPlaying && !global.isLoading && global.duration > 0;
  const progress = isThis ? global.progress : 0;
  const currentTime = isThis ? global.currentTime : 0;
  const duration = isThis && global.duration > 0 ? global.duration : 0;
  const totalLabel = duration > 0 ? global.formatTime(duration) : durationFallback || "—";

  if (!hasAudio) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-divider bg-background p-4 text-[13px] text-muted">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--default)]">
          <VolumeXmark className="size-4 text-muted" aria-hidden="true" />
        </div>
        <span>No recording available for this conversation.</span>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-[13px] text-warning">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-warning/30 bg-background">
          <CircleExclamation className="size-4" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-0.5 pt-0.5">
          <span className="font-semibold">Recording unavailable</span>
          <span>The audio file could not be loaded from the server.</span>
        </div>
      </div>
    );
  }

  async function handleToggle() {
    if (isPlaying) {
      global.pause();
      return;
    }
    if (isPaused) {
      global.resume();
      return;
    }
    try {
      await global.playConversation(conversationId, { title, subtitle });
    } catch {
      setUnavailable(true);
    }
    if (isThis && global.error) setUnavailable(true);
  }

  async function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await getConversationAudioBlob(conversationId, { download: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) setUnavailable(true);
    } finally {
      setIsDownloading(false);
    }
  }

  function skipBy(seconds: number) {
    if (!isThis || duration <= 0) return;
    const next = Math.max(0, Math.min(duration, currentTime + seconds));
    global.seekToPercent((next / duration) * 100);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-divider bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Volume className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate text-[12px] text-muted">{fileName}</span>
        </div>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={isDownloading}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-[var(--default)] hover:text-foreground disabled:opacity-50"
          aria-label="Download recording"
        >
          {isDownloading ? <Spinner size="sm" aria-label="Downloading" /> : <ArrowDownToLine className="size-4" />}
        </button>
      </div>

      <button
        type="button"
        className="group h-2 w-full cursor-pointer rounded-full bg-black/[0.08] dark:bg-white/10"
        onClick={(e) => {
          if (!isThis || duration <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = ((e.clientX - rect.left) / rect.width) * 100;
          global.seekToPercent(pct);
        }}
        aria-label="Seek"
      >
        <div
          className="h-full rounded-full bg-accent transition-all group-hover:bg-accent/80"
          style={{ width: `${progress}%` }}
        />
      </button>

      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>{isThis ? global.formatTime(currentTime) : "0:00"}</span>
        <span>{totalLabel}</span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="ghost" isIconOnly isDisabled={!isThis} onPress={() => skipBy(-10)} aria-label="Back 10 seconds">
          <ForwardStep className="size-4 rotate-180" />
        </Button>
        <Button
          size="sm"
          onPress={() => void handleToggle()}
          isDisabled={isThis && global.isLoading}
          className="min-w-[7rem]"
        >
          {isThis && global.isLoading ? (
            <Spinner size="sm" aria-label="Loading audio" />
          ) : isPlaying ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <CirclePlayFill className="size-4" aria-hidden="true" />
          )}
          <span className="ml-2">
            {isThis && global.isLoading ? "Loading…" : isPlaying ? "Pause" : isPaused ? "Resume" : "Play"}
          </span>
        </Button>
        <Button size="sm" variant="ghost" isIconOnly isDisabled={!isThis} onPress={() => skipBy(10)} aria-label="Forward 10 seconds">
          <ForwardStep className="size-4" />
        </Button>
      </div>

      {isThis && global.error ? (
        <p role="alert" className="text-center text-xs text-danger">
          {global.error}
        </p>
      ) : null}
    </div>
  );
}
