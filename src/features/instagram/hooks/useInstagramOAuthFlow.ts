"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/types/api";
import { instagramApi } from "@/services/api/instagram";
import {
  isInstagramOAuthMessage,
  openInstagramOAuthPopup,
  type InstagramOAuthFlow,
  type InstagramOAuthOption,
} from "@/features/instagram/types";

/**
 * Popup-based OAuth orchestration — traced 1:1 from the old frontend's
 * `useInstagramOAuthFlow.ts`. Opens `authUrl` in a popup, listens for a
 * same-origin `postMessage` from `/instagram-callback` (the page Meta
 * redirects the popup to), and either shows a page-selection dialog
 * (multiple Facebook Pages/Instagram Business accounts found) or reports
 * success/failure — mirrors the backend's `handleOAuthCallback()`
 * discriminated-union response exactly, just relayed through the popup.
 */
export function useInstagramOAuthFlow(opts: {
  workspaceId: string | null;
  userId: string | null;
  onConnected?: () => void;
}) {
  const { workspaceId, userId, onConnected } = opts;
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [options, setOptions] = useState<InstagramOAuthOption[]>([]);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!isInstagramOAuthMessage(event.data)) return;

      clearPoll();
      popupRef.current = null;

      if (event.data.status === "pending_selection") {
        setSelectionToken(event.data.selectionToken);
        setOptions(event.data.options);
        setSelectOpen(true);
        setConnecting(false);
        return;
      }
      if (event.data.status === "success") {
        setConnecting(false);
        setError(null);
        onConnected?.();
        return;
      }
      if (event.data.status === "error") {
        setConnecting(false);
        setError(event.data.message || "Instagram connection failed.");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [clearPoll, onConnected]);

  const startConnect = useCallback(
    async (flow: InstagramOAuthFlow) => {
      if (!workspaceId || !userId || connecting) return;
      setConnecting(true);
      setError(null);
      try {
        const { authUrl } = await instagramApi.getOAuthUrl({ workspaceId, userId, flow, popup: true });
        const popup = openInstagramOAuthPopup(authUrl);
        if (!popup) {
          window.location.href = authUrl;
          return;
        }
        popupRef.current = popup;
        clearPoll();
        pollRef.current = window.setInterval(() => {
          if (!popupRef.current || popupRef.current.closed) {
            clearPoll();
            popupRef.current = null;
            setConnecting(false);
          }
        }, 500);
      } catch (err) {
        setConnecting(false);
        setError(err instanceof ApiError ? err.message : "Could not start the Instagram connection.");
      }
    },
    [workspaceId, userId, connecting, clearPoll],
  );

  return {
    connecting,
    error,
    startConnect,
    selectOpen,
    setSelectOpen,
    selectionToken,
    options,
  };
}
