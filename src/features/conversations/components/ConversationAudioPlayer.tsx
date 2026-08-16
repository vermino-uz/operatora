"use client";

import { Button, Spinner } from "@heroui/react";
import { ArrowDownToLine, CirclePlayFill } from "@gravity-ui/icons";
import { useConversationAudio } from "@/features/conversations/hooks/useConversationAudio";

export interface ConversationAudioPlayerProps {
  conversationId: string;
  hasAudio: boolean;
}

/** Wired to the authenticated `GET /api/play-back/:id` binary proxy (never
 * a raw `audio_file_path` — that's not directly servable, see brief).
 * Playback is lazy: loading only starts once the user presses Play, to
 * avoid firing an audio request for every row skimmed past in the list.
 * No `Range` support is confirmed on this endpoint, so this deliberately
 * doesn't promise a polished scrubber UX on large files — it's a plain
 * native `<audio controls>` element once loaded. */
export function ConversationAudioPlayer({ conversationId, hasAudio }: ConversationAudioPlayerProps) {
  const { src, isLoading, error, load, download, isDownloading } = useConversationAudio(conversationId);

  if (!hasAudio) {
    return <p className="text-sm text-muted">No audio recording available for this conversation.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {src ? (
        <audio controls src={src} className="w-full" data-testid="conversation-audio-player" />
      ) : (
        <div className="flex items-center gap-2">
          <Button size="sm" onPress={load} isDisabled={isLoading}>
            {isLoading ? <Spinner size="sm" aria-label="Loading audio" /> : <CirclePlayFill className="size-4" aria-hidden="true" />}
            {isLoading ? "Loading…" : "Play recording"}
          </Button>
        </div>
      )}

      <div>
        <Button size="sm" variant="secondary" onPress={download} isDisabled={isDownloading}>
          {isDownloading ? <Spinner size="sm" aria-label="Preparing download" /> : <ArrowDownToLine className="size-4" aria-hidden="true" />}
          {isDownloading ? "Preparing…" : "Download"}
        </Button>
      </div>

      {error ? <p className="text-xs text-danger">Could not load audio. Please try again.</p> : null}
    </div>
  );
}
