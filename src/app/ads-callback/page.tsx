"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Spinner } from "@heroui/react";
import { CircleCheck, CircleXmark, CreditCard } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { adsApi } from "@/services/api/ads";
import { LoadingState } from "@/components/shared/LoadingState";
import type { AdAccountOption } from "@/features/ads/types";

/**
 * Standalone page Meta redirects to after consent for the Ads "own"
 * billing-mode connect flow (`ADS_OAUTH_REDIRECT_URL` on the backend must
 * point here) — reference: old frontend's `pages/AdsCallback.tsx`, at
 * `/auth/ads/callback` there. Deliberately at `/ads-callback` instead, same
 * reasoning already established for `/instagram-callback`/`/google-sheets-
 * callback`/`/google-calendar-callback` (outside `(protected)`, no
 * `AppShell` chrome wanted). Unlike Instagram's popup+`postMessage` flow,
 * this is always a full-page redirect (the old frontend's own `Ads.tsx`
 * navigates via `window.location.href =`, never opens a popup) — so this
 * page always finishes by navigating back to `/ads`, no `window.opener`
 * branch needed.
 */
type ViewState = "loading" | "select" | "connecting" | "success" | "error";

function AdsCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<ViewState>("loading");
  const [message, setMessage] = useState("Finishing your connection…");
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [options, setOptions] = useState<AdAccountOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (oauthError) {
        finish(false, errorDescription || oauthError);
        return;
      }
      if (!code || !state) {
        finish(false, "Missing authorization code from Meta.");
        return;
      }

      try {
        const result = await adsApi.oauthCallback({ code, state });
        if (cancelled) return;
        if ("requiresSelection" in result && result.requiresSelection) {
          setSelectionToken(result.selectionToken);
          setOptions(result.options);
          setSelectedId(result.options[0]?.id ?? null);
          setView("select");
          return;
        }
        finish(true, "Your ad account is connected.");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : "Couldn't connect your ad account.";
        finish(false, msg);
      }
    }

    function finish(success: boolean, msg: string) {
      setView(success ? "success" : "error");
      setMessage(msg);
      setTimeout(() => router.replace("/ads"), success ? 1500 : 3500);
    }

    void run();
    return () => {
      cancelled = true;
    };
    // Runs once from the URL's query params on mount — re-running on
    // `searchParams` identity churn would re-exchange an already-consumed code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmAccount = async () => {
    if (!selectionToken || !selectedId) return;
    setView("connecting");
    try {
      await adsApi.oauthConnect({ selectionToken, adAccountId: selectedId });
      setView("success");
      setMessage("Your ad account is connected.");
      setTimeout(() => router.replace("/ads"), 1500);
    } catch (err) {
      setView("error");
      setMessage(err instanceof ApiError ? err.message : "Couldn't connect your ad account.");
      setTimeout(() => router.replace("/ads"), 3500);
    }
  };

  if (view === "select" && selectionToken) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <CreditCard className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Choose an ad account</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-foreground/60">
              Operatora will manage campaigns through this account.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/[0.08] shadow-sm dark:border-white/[0.12]">
            <div className="border-b border-black/[0.08] bg-black/[0.02] px-4 py-3 dark:border-white/[0.12] dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">Ad accounts</p>
            </div>
            <div className="max-h-[min(52vh,420px)] space-y-1 overflow-y-auto p-2">
              {options.map((option) => {
                const selected = selectedId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedId(option.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-accent bg-accent/5"
                        : "border-transparent hover:border-black/[0.08] hover:bg-black/[0.02] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{option.name}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-foreground/50">
                        {option.id} · {option.currency}
                      </p>
                      {option.business_name ? <p className="mt-0.5 truncate text-[11px] text-foreground/40">{option.business_name}</p> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-black/[0.08] px-4 py-4 dark:border-white/[0.12]">
              <Button variant="primary" fullWidth isDisabled={!selectedId} onPress={confirmAccount}>
                Confirm connection
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      {view === "loading" || view === "connecting" ? (
        <>
          <Spinner size="lg" aria-label={message} />
          <h1 className="text-lg font-semibold text-foreground">Connecting your ad account</h1>
          <p className="text-sm text-foreground/60">{message}</p>
        </>
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
          <p className="max-w-sm whitespace-pre-line text-sm text-foreground/60">{message}</p>
          <Button variant="secondary" onPress={() => router.replace("/ads")}>
            Back to Ads
          </Button>
        </>
      )}
    </div>
  );
}

export default function AdsCallbackPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-screen" />}>
      <AdsCallbackContent />
    </Suspense>
  );
}
