"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import { CircleCheck, CircleXmark } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { instagramApi } from "@/services/api/instagram";
import { LoadingState } from "@/components/shared/LoadingState";
import {
  decodeOAuthState,
  INSTAGRAM_OAUTH_MESSAGE,
  type InstagramOAuthMessage,
  type InstagramOAuthOption,
} from "@/features/instagram/types";
import { InstagramOAuthSelectDialog } from "@/features/instagram/components/InstagramOAuthSelectDialog";

/**
 * Standalone page Meta redirects the OAuth popup to (`INSTAGRAM_REDIRECT_URI`
 * on the backend must point here) — traced from the old frontend's
 * `InstagramCallback.tsx`. Deliberately NOT under `(protected)` (no
 * `AppShell` chrome wanted for a popup window) — it still works
 * authenticated because `apiFetch` reads the Bearer token from
 * `localStorage`, which a same-origin popup shares with the opener tab.
 *
 * Relays the result back to the opener via `postMessage` and closes itself
 * when opened as a popup (`state.popup`); falls back to an in-page
 * success/error view + redirect to Settings when opened as a full
 * navigation (popup blocked, or a user opened the link directly).
 */
type ViewState = "loading" | "select" | "connecting" | "success" | "error";

function InstagramCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<ViewState>("loading");
  const [message, setMessage] = useState("Connecting your Instagram account…");
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [options, setOptions] = useState<InstagramOAuthOption[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();

  const notifyOpener = useCallback((payload: InstagramOAuthMessage) => {
    if (!window.opener || window.opener.closed) return false;
    window.opener.postMessage(payload, window.location.origin);
    return true;
  }, []);

  const finishWithError = useCallback(
    (errorMessage: string, isPopup: boolean) => {
      setView("error");
      setMessage(errorMessage);
      if (isPopup && notifyOpener({ type: INSTAGRAM_OAUTH_MESSAGE, status: "error", message: errorMessage })) {
        setTimeout(() => window.close(), 800);
        return;
      }
      setTimeout(() => router.replace("/settings?section=instagram"), 3000);
    },
    [notifyOpener, router],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const stateData = decodeOAuthState<{ popup?: boolean; workspace_id?: string }>(state);
      const isPopup = !!stateData?.popup;

      if (oauthError) {
        finishWithError(errorDescription || oauthError, isPopup);
        return;
      }
      if (!code) {
        finishWithError("Missing authorization code from Instagram.", isPopup);
        return;
      }

      try {
        const result = await instagramApi.oauthCallback({
          code,
          state: state || undefined,
          workspaceId: stateData?.workspace_id,
        });
        if (cancelled) return;
        setWorkspaceId(stateData?.workspace_id);

        if (result.requiresSelection) {
          setSelectionToken(result.selectionToken);
          setOptions(result.options);
          setView("select");
          if (
            isPopup &&
            notifyOpener({
              type: INSTAGRAM_OAUTH_MESSAGE,
              status: "pending_selection",
              selectionToken: result.selectionToken,
              options: result.options,
              workspaceId: stateData?.workspace_id,
            })
          ) {
            window.close();
          }
          return;
        }

        setView("success");
        setMessage("Instagram account connected.");
        if (isPopup && notifyOpener({ type: INSTAGRAM_OAUTH_MESSAGE, status: "success" })) {
          setTimeout(() => window.close(), 600);
          return;
        }
        setTimeout(() => router.replace("/settings?section=instagram"), 1500);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : "Could not connect your Instagram account.";
        finishWithError(msg, isPopup);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // Runs once on mount from the URL's query params — re-running on
    // `searchParams` identity churn would re-exchange an already-consumed
    // authorization code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (view === "select" && selectionToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black/[0.02] p-6 dark:bg-white/[0.02]">
        <InstagramOAuthSelectDialog
          open
          onOpenChange={() => {}}
          selectionToken={selectionToken}
          options={options}
          workspaceId={workspaceId ?? null}
          userId={null}
          onConnected={() => {
            setView("success");
            setMessage("Instagram account connected.");
            setTimeout(() => router.replace("/settings?section=instagram"), 1200);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      {view === "loading" || view === "connecting" ? (
        <LoadingState label={message} />
      ) : view === "success" ? (
        <>
          <CircleCheck className="size-12 text-success" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-foreground">Connected</h1>
          <p className="text-sm text-foreground/60">{message}</p>
        </>
      ) : (
        <>
          <CircleXmark className="size-12 text-danger" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-foreground">Connection failed</h1>
          <p className="max-w-sm text-sm text-foreground/60">{message}</p>
          <Button variant="secondary" onPress={() => router.replace("/settings?section=instagram")}>
            Back to Settings
          </Button>
        </>
      )}
    </div>
  );
}

export default function InstagramCallbackPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-screen" />}>
      <InstagramCallbackContent />
    </Suspense>
  );
}
