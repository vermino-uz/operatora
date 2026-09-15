"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";

import { useCreatePaylovInvoiceMutation } from "@/features/billing/hooks/useBillingSection";
import { billingApi } from "@/services/api/billing";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_DURATION_MS = 10 * 60 * 1000;

/** `NEXT_PUBLIC_PAYMENT_GATEWAY_URL` — the external HAAD payment gateway
 * (`payment.operatora.xyz` in the old app) that mints Payme/Click checkout
 * URLs. This is a *separate* service from the `dev.operatora` NestJS
 * backend this rebuild targets — it isn't part of `billing.controller.ts`
 * or any other controller in that repo, so its request/response contract
 * could only be confirmed by reading the old frontend's own call site
 * (`Checkout.tsx#fetchPaymeClickSession`), not by tracing a backend
 * controller the way every other endpoint in this app is verified. Ported
 * as-is (same URL shape, same fallback default) so the real flow is wired
 * end-to-end, but flagged here and in PROGRESS.md as unverified/untestable
 * in this environment — no test credentials or gateway sandbox access were
 * available to exercise it. */
const PAYMENT_GATEWAY_URL =
  (process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_URL ?? "").trim() || "https://payment.operatora.xyz";

type Phase = "loading" | "ready" | "polling" | "unavailable";

/**
 * Payme/Click/Paylov payment method for `/checkout`. Real, ported flow
 * (see module doc comment above for the one genuinely unverifiable piece —
 * the external gateway call): mint a checkout session from the external
 * gateway, optionally also mint a Paylov invoice via our own backend
 * (`POST /billing/paylov/invoice`, real/confirmed), open whichever
 * provider URL the user picks in a popup, then poll
 * `GET /billing/me`-derived `checkPaid` (passed in by the parent, which
 * already has the real subscription-order context) until the plan
 * activates or the 10-minute cap is hit.
 */
export function CheckoutPaymeClickPanel({
  workspaceId,
  subId,
  amountUzs,
  planLabel,
  checkPaid,
  onPaid,
  onError,
}: {
  workspaceId: string;
  subId: string;
  amountUzs: number;
  planLabel: string;
  checkPaid: () => Promise<boolean>;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const createPaylovInvoice = useCreatePaylovInvoiceMutation(workspaceId);
  const [phase, setPhase] = useState<Phase>("loading");
  const [paymeUrl, setPaymeUrl] = useState<string | null>(null);
  const [clickUrl, setClickUrl] = useState<string | null>(null);
  const [paylovUrl, setPaylovUrl] = useState<string | null>(null);
  const paylovInvoiceIdRef = useRef<number | null>(null);
  const pollHandleRef = useRef<number | null>(null);
  const popupRef = useRef<Window | null>(null);
  const startedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollHandleRef.current != null) {
      window.clearInterval(pollHandleRef.current);
      pollHandleRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback(() => {
    if (pollHandleRef.current != null) return;
    const startedAt = Date.now();
    setPhase("polling");
    pollHandleRef.current = window.setInterval(async () => {
      if (Date.now() - startedAt > POLL_MAX_DURATION_MS) {
        stopPolling();
        return;
      }
      try {
        const invoiceId = paylovInvoiceIdRef.current;
        if (invoiceId != null) {
          try {
            await billingApi.reconcilePaylovInvoice(workspaceId, invoiceId);
          } catch {
            /* transient / not paid yet */
          }
        }
        const paid = await checkPaid();
        if (paid) {
          stopPolling();
          try {
            popupRef.current?.close();
          } catch {
            /* ignore */
          }
          onPaid();
        }
      } catch {
        /* transient network error — keep polling until the cap above */
      }
    }, POLL_INTERVAL_MS);
  }, [checkPaid, onPaid, stopPolling, workspaceId]);

  useEffect(() => {
    if (startedRef.current) return; // guard double-fire on remount
    startedRef.current = true;

    (async () => {
      try {
        const gatewayUrl =
          `${PAYMENT_GATEWAY_URL.replace(/\/+$/, "")}/api/payment/operatora/checkout-session` +
          `?workspaceId=${encodeURIComponent(workspaceId)}&subId=${encodeURIComponent(subId)}`;
        const gatewayRes = await fetch(gatewayUrl, { credentials: "omit" });
        const haad = (await gatewayRes.json()) as {
          ok: boolean;
          paid?: boolean;
          payme_url?: string;
          click_url?: string;
          message?: string;
        };
        if (!gatewayRes.ok || !haad?.ok) {
          throw new Error(haad?.message || "Payment gateway did not respond.");
        }
        if (haad.paid) {
          onPaid();
          return;
        }

        let paylovUrlResult: string | null = null;
        if (amountUzs > 0) {
          try {
            const inv = await createPaylovInvoice.mutateAsync({
              sub_id: subId,
              amount_uzs: amountUzs,
              description: `Operatora ${planLabel} subscription`,
            });
            paylovUrlResult = inv.paylov_url;
            paylovInvoiceIdRef.current = inv.paylov_invoice_id;
          } catch {
            /* Payme/Click from the gateway are still usable without Paylov */
          }
        }

        setPaymeUrl(haad.payme_url ?? null);
        setClickUrl(haad.click_url ?? null);
        setPaylovUrl(paylovUrlResult);
        setPhase(haad.payme_url || haad.click_url || paylovUrlResult ? "ready" : "unavailable");
      } catch (err) {
        onError(err instanceof Error ? err.message : "Payment gateway did not respond.");
        setPhase("unavailable");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire-once effect guarded by startedRef
  }, []);

  function openInPopup(url: string) {
    const w = 500;
    const h = 720;
    const screen = window.screen as Screen & { availLeft?: number; availTop?: number };
    const left = Math.max(0, (screen.availLeft ?? 0) + (screen.availWidth - w) / 2);
    const top = Math.max(0, (screen.availTop ?? 0) + (screen.availHeight - h) / 2);
    const popup = window.open(url, "operatora-payment", `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) {
      onError("Browser blocked the popup. Allow popups in your browser settings.");
      return;
    }
    popupRef.current = popup;
    startPolling();
  }

  if (phase === "loading") return <LoadingRow label="Preparing payment options…" />;

  if (phase === "unavailable") {
    return (
      <div className="rounded-[14px] border border-warning/40 bg-warning/10 px-4 py-3">
        <p className="text-[13px] text-warning">
          Payment gateway is currently unavailable. Please try again in a few minutes, or use the Card method
          instead.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {paymeUrl ? (
        <Button onPress={() => openInPopup(paymeUrl)} className="h-[52px] w-full bg-[#27cd9a] text-[#011c1a]">
          Pay with Payme
        </Button>
      ) : null}
      {clickUrl ? (
        <Button onPress={() => openInPopup(clickUrl)} className="h-[52px] w-full bg-[#1d83e2] text-white">
          Pay with Click
        </Button>
      ) : null}
      {paylovUrl ? (
        <Button onPress={() => openInPopup(paylovUrl)} className="h-[52px] w-full bg-[#0f766e] text-white">
          Pay with Paylov
        </Button>
      ) : null}
      {phase === "polling" ? <LoadingRow label="Waiting for payment result… You don't need to close the popup window." /> : null}
    </div>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-foreground/10 bg-foreground/[0.04] px-4 py-4">
      <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
      <p className="text-[13px] font-medium text-muted">{label}</p>
    </div>
  );
}
