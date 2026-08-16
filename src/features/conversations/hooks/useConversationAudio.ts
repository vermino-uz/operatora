"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getConversationAudioBlob } from "@/services/api/conversations";
import { ApiError } from "@/types/api";

interface UseConversationAudioResult {
  /** Object URL for an `<audio>` element's `src`, or null until loaded. */
  src: string | null;
  isLoading: boolean;
  error: unknown;
  load: () => void;
  download: () => void;
  isDownloading: boolean;
}

/** Fetches the authenticated audio proxy (`GET /api/play-back/:id`) as a
 * `Blob` and manages the resulting object URL's lifecycle — revoked on
 * unmount or when `conversationId` changes, since nothing else owns it.
 * Playback is lazy (`load()`) rather than automatic, so switching between
 * conversation rows doesn't fire an audio request for every row skimmed
 * past. */
export function useConversationAudio(conversationId: string | null): UseConversationAudioResult {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // Reset whenever the selected conversation changes — adjusted during
  // render (React's documented pattern for resetting state on a prop
  // change) rather than in an effect, so it doesn't trigger a cascading
  // extra render via a synchronous setState-in-effect.
  const [trackedId, setTrackedId] = useState(conversationId);
  if (conversationId !== trackedId) {
    setTrackedId(conversationId);
    setSrc(null);
    setError(null);
    setIsLoading(false);
  }

  // Revoke the previous object URL once the conversation actually changes
  // (or on unmount) — a real side effect, so it stays in an effect, but it
  // never calls setState.
  useEffect(() => {
    return revoke;
  }, [conversationId, revoke]);

  const load = useCallback(() => {
    if (!conversationId || isLoading || src) return;
    setIsLoading(true);
    setError(null);
    getConversationAudioBlob(conversationId)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setSrc(url);
      })
      .catch((err) => setError(err instanceof ApiError ? err : new Error("Could not load audio.")))
      .finally(() => setIsLoading(false));
  }, [conversationId, isLoading, src]);

  const download = useCallback(() => {
    if (!conversationId || isDownloading) return;
    setIsDownloading(true);
    getConversationAudioBlob(conversationId, { download: true })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversation-${conversationId}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch((err) => setError(err instanceof ApiError ? err : new Error("Could not download audio.")))
      .finally(() => setIsDownloading(false));
  }, [conversationId, isDownloading]);

  return { src, isLoading, error, load, download, isDownloading };
}
