"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "@gravity-ui/icons";

import { OperatoraWordmark } from "@/features/auth/components/OperatoraMark";
import { useRequireAuth } from "@/features/auth/hooks/useRequireAuth";
import { useSessionStore } from "@/state/session-store";
import { authApi } from "@/services/api/auth";
import { LoadingState } from "@/components/shared/LoadingState";

type PlanKey = "free" | "pro" | "max";

const FEATURES: Record<PlanKey, { glyph: string; title: string; desc: string; pill?: string }[]> = {
  free: [
    { glyph: "◐", title: "100 calls / month", desc: "With basic AI analysis." },
    { glyph: "▦", title: "1 AI dashboard", desc: "Key metrics." },
    { glyph: "◇", title: "500 MB storage", desc: "30-day retention." },
    { glyph: "◆", title: "Email support", desc: "Upgrade to Pro for chat.", pill: "PRO" },
  ],
  pro: [
    { glyph: "◐", title: "Unlimited AI analysis", desc: "Calls, chats, lead scoring." },
    { glyph: "▦", title: "4 AI dashboards", desc: "Marketing, sales, revenue, activity.", pill: "NEW" },
    { glyph: "◉", title: "Real-time updates", desc: "Customer activity appears instantly." },
    { glyph: "◆", title: "Priority support", desc: "Email and chat — response within 24 hours." },
  ],
  max: [
    { glyph: "✦", title: "Agentic Mode", desc: "An AI agent that works on your behalf.", pill: "EARLY ACCESS" },
    { glyph: "▦", title: "Unlimited AI dashboards", desc: "Marketing, sales, revenue, activity." },
    { glyph: "◇", title: "200 GB storage", desc: "Unlimited retention." },
    { glyph: "◐", title: "50,000 calls / month", desc: "Telegram, Instagram, WhatsApp, SMS." },
  ],
};

/**
 * `/welcome` — post-signup / post-checkout onboarding screen. Content
 * ported from the old frontend's `Welcome.tsx` + `locales/en/billing.json`
 * (`welcome.*`). Reached from two real completion points in this rebuild:
 * `SignUpForm.tsx` (free-plan signup, `?plan=free`) and
 * `CheckoutPageContent.tsx` (`onPaid`, `?plan=pro|max`) — the same two
 * entry points the old app's `Welcome.tsx` documents itself as serving.
 *
 * "Set up my workspace with AI" is ported as a real button (sets the same
 * `operatora:autoOpenOnboarding` sessionStorage flag the old app sets) but
 * flagged here and in PROGRESS.md: this rebuild has no onboarding-wizard
 * widget yet (the old app's `OnboardingWidgetProvider`/`AppShell` don't
 * have an equivalent here) to actually consume that flag, so both buttons
 * land on `/dashboard` today — not a fabricated wizard, just an honestly
 * inert flag until that widget is built.
 */
export function WelcomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const plan: PlanKey = planParam === "free" ? "free" : planParam === "max" ? "max" : "pro";
  const isPaid = plan !== "free";
  const planLabel = plan === "max" ? "Max" : "Pro";

  const { isChecking, isAuthenticated } = useRequireAuth("/login");
  const user = useSessionStore((s) => s.user);
  const clear = useSessionStore((s) => s.clear);

  const refundEndLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(d);
  }, []);

  const firstName = useMemo(() => {
    if (!user) return "";
    const fullName = user.full_name ?? user.profile?.full_name;
    if (fullName) return fullName.split(" ")[0];
    if (user.email) {
      const local = user.email.split("@")[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return "";
  }, [user]);

  async function signOut() {
    try {
      await authApi.logout();
    } finally {
      clear();
      router.replace("/login");
    }
  }

  if (isChecking || !isAuthenticated) {
    return <LoadingState label="Loading your account…" className="min-h-svh" />;
  }

  const badgeLabel = plan === "free" ? "FREE · FREE FOREVER" : plan === "max" ? "MAX · 7-DAY GUARANTEE" : "PRO · 7-DAY GUARANTEE";

  return (
    <div className="dark relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground sm:px-10 lg:px-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 right-[10%] size-[780px] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, color-mix(in oklch, var(--accent) 22%, transparent) 0%, transparent 75%)",
          filter: "blur(10px)",
        }}
      />

      <div className="relative z-10 mb-8 flex w-full max-w-[920px] items-center justify-between">
        <OperatoraWordmark />
        <div className="flex items-center gap-4">
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3.5">
            <span className="size-1.5 rounded-full bg-accent" />
            <span className="text-[11px] font-semibold tracking-[0.44px] text-accent">{badgeLabel}</span>
          </span>
          <button type="button" onClick={() => void signOut()} className="text-[13px] font-medium text-muted transition-colors hover:text-foreground">
            Sign out
          </button>
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-[920px] flex-col gap-8 rounded-[32px] border border-foreground/[0.06] bg-[color-mix(in_oklch,var(--surface)_78%,var(--background)_22%)] px-8 pb-10 pt-14 shadow-[0px_32px_80px_-10px_rgba(0,0,0,0.5)] sm:px-12 lg:px-14">
        <div className="flex flex-col items-center gap-5">
          <span className="inline-flex size-[72px] items-center justify-center rounded-full border-[1.5px] border-accent/45 bg-accent/15 text-[34px] font-semibold text-accent">
            ✓
          </span>
          <span className="inline-flex h-7 items-center gap-2 rounded-full border border-foreground/[0.12] bg-foreground/[0.06] px-2.5">
            <span className="size-1.5 rounded-full bg-accent" />
            <span className="text-[10px] font-semibold tracking-[0.44px] text-foreground">ACCOUNT READY</span>
          </span>
          <h1 className="text-center text-[36px] font-semibold leading-[1.1] tracking-[-1.44px] text-foreground sm:text-[44px] lg:text-[48px]">
            Welcome{firstName ? `, ${firstName}` : ""}.
          </h1>
          <div className="flex flex-col items-center text-center text-[15px] leading-[1.5] text-muted sm:text-[17px]">
            <p>
              {plan === "free"
                ? "You've started on the free plan — upgrade to Pro or Max anytime."
                : `All ${planLabel} plan features are now available to you.`}
            </p>
            <p>Let&apos;s get started with Operatora.</p>
          </div>
        </div>

        {isPaid ? (
          <div className="flex flex-col items-start gap-4 rounded-[20px] border border-accent/22 bg-accent/[0.08] px-5 py-5 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-accent/25 text-[18px] font-semibold tracking-[-0.36px] text-accent">
              7
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[14px] font-semibold text-foreground">
                Money-back guarantee · until {refundEndLabel}
              </p>
              <p className="text-[13px] leading-[1.5] text-muted">
                Not satisfied within 7 days — full refund, no questions asked.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col items-end gap-1 sm:w-[140px]">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.22px] text-accent">
                <span className="size-1.5 rounded-full bg-accent" />
                100% GUARANTEE
              </span>
            </div>
          </div>
        ) : null}

        <h3 className="text-[18px] font-semibold tracking-[-0.36px] text-foreground">
          {plan === "free" ? "What's included in the free plan" : `What's included in the ${planLabel} plan`}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES[plan].map((f) => (
            <div key={f.title} className="flex items-center gap-[14px] rounded-[16px] border border-foreground/[0.08] bg-foreground/[0.04] px-[18px] py-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-accent/15 text-[18px] font-semibold text-accent">
                {f.glyph}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-semibold text-foreground">{f.title}</p>
                  {f.pill ? (
                    <span className="inline-flex items-center rounded-full bg-accent/15 px-1.5 py-[3px] text-[9px] font-semibold tracking-[0.36px] text-accent">
                      {f.pill}
                    </span>
                  ) : null}
                </div>
                <p className="text-[12px] leading-[1.5] text-muted">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="h-[58px] rounded-[14px] border border-foreground/[0.22] px-7 text-[15px] font-semibold text-foreground transition-colors hover:bg-foreground/[0.04] sm:w-[200px]"
          >
            Skip, I&apos;ll do it myself
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("operatora:autoOpenOnboarding", "1");
              router.push("/dashboard");
            }}
            className="flex h-[58px] flex-1 items-center justify-center gap-2.5 rounded-[14px] bg-accent px-7 text-[15px] font-semibold text-accent-foreground transition-[filter] hover:brightness-95"
          >
            Set up my workspace with AI
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/settings?section=crm-integrations")}
          className="self-center text-[13px] font-medium text-muted transition-colors hover:text-foreground hover:underline hover:underline-offset-4 sm:self-start"
        >
          Migrating from amoCRM? Import your leads →
        </button>
      </div>

      <div className="relative z-10 flex items-center gap-2 pt-5">
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="text-center text-[12px] font-medium tracking-[0.24px] text-muted">
          Settings → Notifications → Email ready. You can turn it off anytime.
        </span>
      </div>
    </div>
  );
}
