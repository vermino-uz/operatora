"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "@gravity-ui/icons";

import { OperatoraWordmark } from "@/features/auth/components/OperatoraMark";
import { useMe } from "@/features/auth/hooks/useMe";
import { useSessionStore } from "@/state/session-store";
import { billingApi } from "@/services/api/billing";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60_000;

/**
 * `/operatora/success` — payment-gateway return URL after Payme/Click,
 * ported from the old app's `PaymentSuccess.tsx`. Polls the real
 * `GET /billing/me` (via `billingApi.me`) until the workspace's plan
 * activates (mirrors the gateway webhook's async settlement — this page's
 * whole reason to exist is that the redirect back from Payme/Click often
 * lands before the webhook has finished processing), then hands off to
 * `/welcome`. Works for both signed-in and signed-out landings, same as
 * the old page (a payment popup can return to this URL in a fresh tab
 * without the parent app's session state).
 */
export function PaymentSuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const meQuery = useMe();
  const user = useSessionStore((s) => s.user);
  const workspaceId = useSessionStore((s) => s.workspaceId);
  // Only flips true if the 60s poll below times out without the plan
  // activating — kept separate from the "not authenticated" case so no
  // branch needs to call setState synchronously inside the effect body.
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (meQuery.isLoading || !user || !workspaceId) return;

    let cancelled = false;
    const startedAt = Date.now();
    const poll = async () => {
      try {
        const data = await billingApi.me(workspaceId);
        if (data.status === "active" && (data.tier === "pro" || data.tier === "max")) {
          if (!cancelled) router.replace(`/welcome?plan=${data.tier}`);
          return;
        }
      } catch {
        /* keep polling until the timeout below */
      }
      if (!cancelled && Date.now() - startedAt < POLL_TIMEOUT_MS) {
        window.setTimeout(poll, POLL_INTERVAL_MS);
      } else if (!cancelled) {
        setTimedOut(true);
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [meQuery.isLoading, user, workspaceId, router]);

  const processing = !meQuery.isLoading && !!user && !!workspaceId && !timedOut;

  return (
    <div className="dark relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 right-[10%] size-[620px] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, color-mix(in oklch, var(--accent) 22%, transparent) 0%, transparent 75%)",
          filter: "blur(10px)",
        }}
      />
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <OperatoraWordmark />
        </div>
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border border-accent/35 bg-accent/15">
          {processing ? (
            <span className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
          ) : (
            <Check className="size-8 text-accent" aria-hidden="true" />
          )}
        </div>
        <h1 className="mb-2 text-[24px] font-semibold text-foreground">
          {processing ? "Payment received" : "Payment successful"}
        </h1>
        <p className="mb-1 text-[14px] text-accent/80">
          {processing ? "Activating your plan…" : "Your subscription will be activated shortly."}
        </p>
        {orderId ? <p className="mb-8 font-mono text-[12px] text-muted/70">Order: {orderId}</p> : null}
        <div className="flex flex-col gap-3">
          {user ? (
            <button
              type="button"
              onClick={() => router.replace("/dashboard")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[14px] font-semibold text-accent-foreground transition-[filter] hover:brightness-95"
            >
              Go to home page
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[14px] font-semibold text-accent-foreground transition-[filter] hover:brightness-95"
            >
              Sign in
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
