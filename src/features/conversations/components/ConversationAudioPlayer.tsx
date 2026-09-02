"use client";

import { useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { ArrowDownToLine, CirclePlayFill } from "@gravity-ui/icons";

import { useGlobalAudio } from "@/features/audio/GlobalAudioProvider";
import { getConversationAudioBlob } from "@/services/api/conversations";
import { ApiError } from "@/types/api";

export interface ConversationAudioPlayerProps {
  conversationId: string;
  hasAudio: boolean;
  title?: string;
  subtitle?: string;
}

/** Starts playback in the app-wide floating PiP player (persists across pages
 * until dismissed). Download stays inline. */
export function ConversationAudioPlayer({
  conversationId,
  hasAudio,
  title,
  subtitle,
}: ConversationAudioPlayerProps) {
  const global = useGlobalAudio();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isThisTrack = global.conversationId === conversationId;
  const isActiveHere = isThisTrack && global.isActive;

  if (!hasAudio) {
    return <p className="text-sm text-muted">No audio recording available for this conversation.</p>;
  }

  async function handlePlay() {
    setDownloadError(null);
    await global.playConversation(conversationId, { title, subtitle });
  }

  async function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const blob = await getConversationAudioBlob(conversationId, { download: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${conversationId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof ApiError && err.statusCode === 404
          ? "Recording file is missing on the server."
          : "Could not download audio.";
      setDownloadError(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onPress={() => void handlePlay()}
          isDisabled={isThisTrack && global.isLoading}
        >
          {isThisTrack && global.isLoading ? (
            <Spinner size="sm" aria-label="Loading audio" />
          ) : (
            <CirclePlayFill className="size-4" aria-hidden="true" />
          )}
          {isThisTrack && global.isLoading
            ? "Loading…"
            : isActiveHere && global.isPlaying
              ? "Playing in mini player"
              : isActiveHere
                ? "Open mini player"
                : "Play recording"}
        </Button>

        <Button size="sm" variant="secondary" onPress={() => void handleDownload()} isDisabled={isDownloading}>
          {isDownloading ? <Spinner size="sm" aria-label="Preparing download" /> : <ArrowDownToLine className="size-4" aria-hidden="true" />}
          {isDownloading ? "Preparing…" : "Download"}
        </Button>
      </div>

      {isActiveHere && global.error ? (
        <p role="alert" className="text-xs text-danger">
          {global.error}
        </p>
      ) : null}
      {downloadError ? (
        <p role="alert" className="text-xs text-danger">
          {downloadError}
        </p>
      ) : null}

      <p className="text-xs text-foreground/45">
        Playback continues in the floating mini player while you browse the app. Close it there when you&apos;re done.
      </p>
    </div>
  );
}
