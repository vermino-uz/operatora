"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import { CreditCard, Lock, ShieldCheck } from "@gravity-ui/icons";

import { OperatoraWordmark } from "@/features/auth/components/OperatoraMark";
import { useRequireAuth } from "@/features/auth/hooks/useRequireAuth";
import { useSessionStore } from "@/state/session-store";
import { useCreateSubscriptionOrderMutation } from "@/features/billing/hooks/useBillingSection";
import { formatSom } from "@/features/billing/types";
import { billingApi } from "@/services/api/billing";
import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { CheckoutCardPanel } from "@/features/checkout/components/CheckoutCardPanel";
import { CheckoutPaymeClickPanel } from "@/features/checkout/components/CheckoutPaymeClickPanel";

type Plan = "pro" | "max";
type Cycle = "monthly" | "yearly";
type Status = "creating" | "ready" | "paid" | "error";
type Method = "card" | "payme_click";

function checkoutErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only the workspace owner can purchase a plan.";
    if (error.isValidationError) return error.message;
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

/**
 * `/checkout` — real order-creation + payment flow. `App.tsx` in the old
 * app wraps this route only in `<AuthProvider>` (not `<ProtectedRoute>`),
 * and `Checkout.tsx` itself redirects to `/auth` once loading resolves with
 * no user — reproduced here via `useRequireAuth` rather than the full
 * `(protected)` app shell, matching this rebuild's `(auth)` route group
 * ("own layout, no protected shell" — see ARCHITECTURE.md's folder
 * structure notes).
 *
 * Order creation (`POST /billing/subscriptions`) and the Card payment
 * method (saved cards + add/OTP + `POST /billing/subscriptions/charge`)
 * are fully real, traced directly against `subscriptions.controller.ts`/
 * `billing.controller.ts` and already-built hooks from this app's own
 * Settings → Billing section. The Payme/Click method additionally depends
 * on an external payment gateway service that isn't part of the
 * `dev.operatora` backend and couldn't be exercised in this environment —
 * see `CheckoutPaymeClickPanel.tsx`'s doc comment for the explicit flag.
 */
export function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan: Plan = searchParams.get("plan") === "max" ? "max" : "pro";
  const cycle: Cycle = searchParams.get("cycle") === "monthly" ? "monthly" : "yearly";
  const planLabel = plan === "max" ? "Max" : "Pro";

  const { isChecking, isAuthenticated } = useRequireAuth("/login");
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const createOrder = useCreateSubscriptionOrderMutation(workspaceId);

  const [status, setStatus] = useState<Status>("creating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState(0);
  const [method, setMethod] = useState<Method>("card");
  const [lineItems, setLineItems] = useState<{ label: string; quantity: number; amount_uzs: number }[]>([]);
  const startedRef = useRef(false);

  const prepareCheckout = useCallback(async () => {
    setStatus("creating");
    setErrorMessage(null);
    try {
      const order = await createOrder.mutateAsync({ plan, cycle });
      setSubId(order.sub_id);
      setOrderAmount(Number(order.amount) || 0);
      setLineItems(order.line_items ?? []);
      setStatus("ready");
    } catch (err) {
      setErrorMessage(checkoutErrorMessage(err));
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, cycle]);

  useEffect(() => {
    if (startedRef.current || !isAuthenticated || !workspaceId) return;
    startedRef.current = true; // guard double-fire on remount (money-touching order creation)
    void prepareCheckout();
  }, [isAuthenticated, workspaceId, prepareCheckout]);

  const handlePaid = useCallback(() => {
    setStatus("paid");
    window.setTimeout(() => {
      router.replace(`/welcome?plan=${plan}`);
    }, 1200);
  }, [router, plan]);

  const checkSubscriptionPaid = useCallback(async (): Promise<boolean> => {
    if (!workspaceId) return false;
    try {
      const data = await billingApi.me(workspaceId);
      return data.tier === plan && data.status === "active";
    } catch {
      return false;
    }
  }, [workspaceId, plan]);

  if (isChecking || !isAuthenticated) {
    return <LoadingState label="Checking your session…" className="min-h-svh" />;
  }

  return (
    <div className="dark flex min-h-svh w-full flex-col bg-background text-foreground lg:flex-row">
      <section className="relative flex flex-col justify-between gap-10 overflow-hidden bg-background px-8 py-10 sm:px-12 lg:min-h-svh lg:w-1/2 lg:px-14 lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 left-[40%] size-[620px] rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, color-mix(in oklch, var(--accent) 22%, transparent) 0%, transparent 75%)",
            filter: "blur(8px)",
          }}
        />

        <div className="relative z-10">
          <OperatoraWordmark />
        </div>

        <div className="relative z-10 flex max-w-[560px] flex-col gap-6">
          <span className="inline-flex h-8 items-center gap-2 self-start rounded-full border border-accent/35 bg-accent/10 px-3.5">
            <span className="size-1.5 rounded-full bg-accent" />
            <span className="text-[11px] font-semibold tracking-[0.48px] text-accent">
              7-DAY MONEY-BACK GUARANTEE
            </span>
          </span>

          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-1.68px] text-foreground sm:text-[48px] lg:text-[56px]">
            Upgrade to the {planLabel} plan.
          </h1>

          <p className="max-w-[520px] text-[15px] leading-[1.6] text-muted">
            Pay by card, or via Payme / Click in a secure external window. Card details are never stored on our
            servers.
          </p>

          <div className="mt-2 flex flex-col gap-5 rounded-[24px] border border-accent/25 bg-accent/[0.06] px-7 py-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-[18px] font-semibold tracking-[-0.36px] text-foreground">{planLabel} plan</p>
                <p className="text-[13px] leading-[1.5] text-muted">
                  {plan === "max" ? "50,000 calls · 200 GB · Agentic Mode" : "10,000 calls · 50 GB · 4 AI dashboards"}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-accent px-2.5 py-[5px] text-[10px] font-semibold tracking-[0.4px] text-accent-foreground">
                {plan === "max" ? "PREMIUM" : "POPULAR"}
              </span>
            </div>

            <div className="flex items-end gap-2">
              <p className="text-[44px] font-semibold leading-none tracking-[-1.32px] text-foreground">
                {orderAmount > 0 ? formatSom(orderAmount) : "—"}
              </p>
              <p className="pb-2 text-[13px] font-medium text-muted">due today</p>
            </div>

            <div className="h-px w-full bg-foreground/[0.08]" />

            {lineItems.length > 0 ? (
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {lineItems.map((li, i) => (
                  <li key={`${li.label}-${i}`} className="flex items-center justify-between gap-3 text-muted">
                    <span>
                      {li.label}
                      {li.quantity > 1 ? ` × ${li.quantity}` : ""}
                    </span>
                    <span className="tabular-nums text-foreground">{formatSom(li.amount_uzs)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted">Due today</span>
                <span className="text-[15px] font-semibold text-foreground">
                  {orderAmount > 0 ? formatSom(orderAmount) : "—"}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted">7-day guarantee</span>
              <span className="text-[13px] font-semibold text-accent">100% refund</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <TrustRow icon={<ShieldCheck className="size-4" aria-hidden="true" />} label="SSL encrypted payment" />
            <TrustRow icon={<Lock className="size-4" aria-hidden="true" />} label="Card tokenized via Paylov — PAN never stored on Operatora" />
            <TrustRow icon={<CreditCard className="size-4" aria-hidden="true" />} label="Uzcard · Humo · Payme · Click" />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[12px] text-muted/80">© {new Date().getFullYear()} Operatora LLC</span>
          <button
            type="button"
            onClick={() => router.push("/pricing")}
            className="text-[12px] font-medium text-muted transition-colors hover:text-foreground"
          >
            ← Switch to another plan
          </button>
        </div>
      </section>

      <section className="relative flex flex-col items-stretch bg-[color-mix(in_oklch,var(--background)_92%,var(--surface)_8%)] px-6 pb-8 pt-6 sm:px-12 lg:min-h-svh lg:w-1/2 lg:px-14">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StepPill state="done" index={1} label="Account" />
            <StepPill state="done" index={2} label="Plan" />
            <StepPill state="active" index={3} label="Payment" />
          </div>
          <button
            type="button"
            onClick={() => router.push("/welcome?plan=free")}
            className="text-[13px] font-medium text-muted transition-colors hover:text-foreground"
          >
            Later
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="flex w-full max-w-[520px] flex-col gap-7 rounded-[28px] border border-foreground/[0.08] bg-[color-mix(in_oklch,var(--surface)_78%,var(--background)_22%)] px-8 py-10 shadow-[0px_24px_60px_-10px_rgba(0,0,0,0.4)] sm:px-10">
            <div className="flex flex-col gap-3">
              <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.9px] text-foreground sm:text-[30px]">
                Choose payment method
              </h2>
              <p className="text-[14px] leading-[1.55] text-muted">
                Pay by card, Payme, or Click — whichever works best for you.
              </p>
            </div>

            {status === "error" ? (
              <CheckoutErrorState
                message={errorMessage}
                onRetry={() => {
                  startedRef.current = false;
                  void prepareCheckout();
                }}
                onBack={() => router.push("/pricing")}
              />
            ) : status === "paid" ? (
              <div className="flex items-center gap-3 rounded-[14px] border border-accent/40 bg-accent/10 px-4 py-4">
                <span className="text-[14px] font-medium text-foreground">
                  Your plan has been activated. Redirecting to get started…
                </span>
              </div>
            ) : status === "ready" && subId ? (
              <div className="flex flex-col gap-5">
                <MethodSelector method={method} onChange={setMethod} />
                {workspaceId ? (
                  method === "card" ? (
                    <CheckoutCardPanel
                      workspaceId={workspaceId}
                      subId={subId}
                      amountUzs={orderAmount}
                      onPaid={handlePaid}
                      onError={setErrorMessage}
                    />
                  ) : (
                    <CheckoutPaymeClickPanel
                      workspaceId={workspaceId}
                      subId={subId}
                      amountUzs={orderAmount}
                      planLabel={planLabel}
                      checkPaid={checkSubscriptionPaid}
                      onPaid={handlePaid}
                      onError={setErrorMessage}
                    />
                  )
                ) : null}
                {errorMessage && method === "card" ? <p className="text-sm text-danger">{errorMessage}</p> : null}
              </div>
            ) : (
              <LoadingState label="Preparing order…" />
            )}

            <div className="flex items-center justify-center gap-1.5 pt-1">
              <Lock className="size-3 text-accent" aria-hidden="true" />
              <span className="text-[12px] font-medium tracking-[0.24px] text-muted">
                256-bit SSL · refund within 7 days · cancel anytime
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between">
          <nav className="flex items-center gap-6 text-[12px] font-medium text-muted">
            <a href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </a>
            <a href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </a>
            <a href="/refund" className="transition-colors hover:text-foreground">
              Refund
            </a>
            <a href="mailto:sales@operatora.uz" className="transition-colors hover:text-foreground">
              Help
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent" />
            <span className="text-[12px] font-medium tracking-[0.24px] text-muted">All services operational</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function MethodSelector({ method, onChange }: { method: Method; onChange: (m: Method) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] border border-foreground/[0.08] bg-foreground/[0.04] p-1">
      <button
        type="button"
        onClick={() => onChange("card")}
        className={`h-10 flex-1 rounded-[10px] text-[13px] font-semibold transition-colors ${
          method === "card" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        Card
      </button>
      <button
        type="button"
        onClick={() => onChange("payme_click")}
        className={`h-10 flex-1 rounded-[10px] text-[13px] font-semibold transition-colors ${
          method === "payme_click" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        Payme · Click
      </button>
    </div>
  );
}

function CheckoutErrorState({
  message,
  onRetry,
  onBack,
}: {
  message: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-danger/40 bg-danger/[0.08] px-4 py-3">
        <p className="text-[13px] leading-[1.55] text-danger">{message ?? "Unknown error."}</p>
      </div>
      <Button onPress={onRetry} className="h-[52px] w-full">
        Try again
      </Button>
      <button type="button" onClick={onBack} className="text-[13px] font-medium text-muted hover:text-foreground">
        ← Change plan
      </button>
    </div>
  );
}

function StepPill({ state, index, label }: { state: "done" | "active" | "pending"; index: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-flex size-[22px] items-center justify-center rounded-full text-[11px] font-semibold ${
          state === "done"
            ? "bg-accent/25 text-accent"
            : state === "active"
              ? "bg-accent text-accent-foreground"
              : "bg-foreground/[0.1] text-muted"
        }`}
      >
        {state === "done" ? "✓" : index}
      </span>
      <span
        className={`hidden text-[13px] sm:inline ${
          state === "pending" ? "font-medium text-muted" : "font-semibold text-foreground"
        }`}
      >
        {label}
      </span>
    </span>
  );
}

function TrustRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-accent/15 text-accent">
        {icon}
      </span>
      <span className="text-[13px] font-medium text-muted">{label}</span>
    </div>
  );
}
