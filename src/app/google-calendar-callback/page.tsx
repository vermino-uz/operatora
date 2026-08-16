"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import { CircleCheck, CircleXmark } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { googleCalendarApi } from "@/services/api/googleCalendar";
import { LoadingState } from "@/components/shared/LoadingState";

/**
 * Standalone page Google redirects to after consent (`redirect_uri` passed
 * to `/google-calendar/oauth-url` — must be registered on the Google Cloud
 * OAuth client, an infra/deployment detail outside this frontend's
 * control). Deliberately outside `(protected)` for the same reason as
 * `/instagram-callback` — no `AppShell` chrome wanted in a popup, and it
 * still works authenticated since a same-origin popup shares the opener's
 * `localStorage` Bearer token.
 *
 * Popup-vs-full-navigation is detected via `window.opener` at runtime (see
 * `GoogleCalendarSettingsPanel`'s doc comment for why — the backend's OAuth
 * state has no client-controlled `popup` flag to round-trip like
 * Instagram's does).
 */
type ViewState = "loading" | "success" | "error";

function GoogleCalendarCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<ViewState>("loading");
  const [message, setMessage] = useState("Connecting your Google Calendar…");

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
        const result = await googleCalendarApi.completeOAuth({
          code,
          state: state || undefined,
          redirect_uri: `${window.location.origin}/google-calendar-callback`,
        });
        if (cancelled) return;
        finish(true, result.google_email ? `Connected as ${result.google_email}.` : "Google Calendar connected.");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : "Could not connect Google Calendar.";
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
      setTimeout(() => router.replace("/settings?section=google-calendar"), success ? 1500 : 3000);
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
          <Button variant="secondary" onPress={() => router.replace("/settings?section=google-calendar")}>
            Back to Settings
          </Button>
        </>
      )}
    </div>
  );
}

export default function GoogleCalendarCallbackPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-screen" />}>
      <GoogleCalendarCallbackContent />
    </Suspense>
  );
}
