"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import { CircleCheck, CircleXmark } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { googleSheetsApi } from "@/services/api/googleSheets";
import { LoadingState } from "@/components/shared/LoadingState";

/**
 * Standalone page Google redirects to after consent for the Google Sheets
 * connection (`redirect_uri` passed to `/google-sheets/oauth-url` — must be
 * registered on the Google Cloud OAuth client). Deliberately outside
 * `(protected)`, same reasoning as `/instagram-callback` and
 * `/google-calendar-callback`. Popup-vs-full-navigation detected via
 * `window.opener` at runtime (see `GoogleSheetsSettingsPanel`'s doc
 * comment).
 */
type ViewState = "loading" | "success" | "error";

function GoogleSheetsCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<ViewState>("loading");
  const [message, setMessage] = useState("Connecting your Google account…");

  useEffect(() => {
    let cancelled = false;
    const isPopup = !!window.opener && !window.opener.closed;

    async function run() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (oauthError) {
        finish(false, errorDescription || oauthError);
        return;
      }
      if (!code) {
        finish(false, "Missing authorization code from Google.");
        return;
      }

      try {
        await googleSheetsApi.completeOAuth({
          code,
          state: state || undefined,
          redirect_uri: `${window.location.origin}/google-sheets-callback`,
        });
        if (cancelled) return;
        finish(true, "Google Sheets connected.");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : "Could not connect your Google account.";
        finish(false, msg);
      }
    }

    function finish(success: boolean, msg: string) {
      setView(success ? "success" : "error");
      setMessage(msg);
      if (isPopup) {
        setTimeout(() => window.close(), success ? 600 : 1500);
        return;
      }
      setTimeout(() => router.replace("/settings?section=google-sheets"), success ? 1500 : 3000);
    }

    void run();
    return () => {
      cancelled = true;
    };
    // Runs once from the URL's query params on mount — re-running on
    // `searchParams` identity churn would re-exchange an already-consumed code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      {view === "loading" ? (
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
          <Button variant="secondary" onPress={() => router.replace("/settings?section=google-sheets")}>
            Back to Settings
          </Button>
        </>
      )}
    </div>
  );
}

export default function GoogleSheetsCallbackPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-screen" />}>
      <GoogleSheetsCallbackContent />
    </Suspense>
  );
}
