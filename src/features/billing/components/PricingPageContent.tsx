"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";

import { OperatoraWordmark } from "@/features/auth/components/OperatoraMark";
import { useSessionStore } from "@/state/session-store";
import { useMe } from "@/features/auth/hooks/useMe";
import { useBillingFeaturesQuery } from "@/features/team/hooks/useBilling";
import { PlanCard } from "@/features/billing/components/PlanCard";
import {
  DISPLAY_PRICES,
  HERO_SUBTITLE,
  HERO_TITLE,
  OPERATOR_ADDON,
  PLAN_CORPORATE,
  PLAN_FREE,
  PLAN_MAX,
  PLAN_PRO,
  PRICE_SUFFIX,
  PRICING_BADGE,
  normalizePlanSlug,
  type BillingCycle,
  type PlanKey,
} from "@/features/billing/pricingContent";

/**
 * `/pricing` — real, permanently-public plan-selection page (ARCHITECTURE.md
 * lists it under "Auth-adjacent", but the old app's own `App.tsx` wraps it
 * only in `<AuthProvider>`, never `<ProtectedRoute>` — confirmed by reading
 * the route table directly. It behaves identically for guests and signed-in
 * users, just with a different CTA target, so `(public)` is the correct
 * route group, not `(auth)`).
 *
 * Plan content is static (see `pricingContent.ts` doc comment for why — the
 * old page never calls a dynamic plans endpoint). The one real network call
 * here is `GET /billing/me` for the signed-in "current plan" banner/CTA
 * state, reusing the same `useBillingFeaturesQuery` Team Members/Settings
 * already built.
 */
export function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCycle: BillingCycle = searchParams.get("cycle") === "monthly" ? "monthly" : "yearly";
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [showFree, setShowFree] = useState(false);

  const meQuery = useMe();
  const user = useSessionStore((s) => s.user);
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const isAuthed = !meQuery.isLoading && !!user;

  const billingQuery = useBillingFeaturesQuery(isAuthed ? workspaceId : null);
  const billing = billingQuery.data;

  const currentPlanSlug: PlanKey = useMemo(
    () => normalizePlanSlug(billing?.planSlug ?? billing?.tier),
    [billing?.planSlug, billing?.tier],
  );
  const needsRenew = billing?.access === "grace" || billing?.access === "read_only";

  function pickPlan(plan: PlanKey) {
    if (plan === "corporate") {
      window.location.href = "mailto:hello@operatora.uz?subject=Corporate%20plan%20demo";
      return;
    }
    if (isAuthed) {
      if (plan === currentPlanSlug && !needsRenew) return;
      if (plan === "free") return;
      router.push(`/checkout?plan=${plan}&cycle=${cycle}`);
      return;
    }
    router.push(`/signup?plan=${plan}&cycle=${cycle}`);
  }

  function ctaLabel(plan: PlanKey, authedLabel: string, guestLabel: string): string {
    if (isAuthed && currentPlanSlug === plan && needsRenew) return "Renew plan";
    if (isAuthed && currentPlanSlug === plan) return "Current plan";
    return isAuthed ? authedLabel : guestLabel;
  }

  return (
    <div className="dark relative flex min-h-svh w-full flex-col items-center gap-10 overflow-hidden bg-background px-6 py-10 text-foreground sm:px-12 lg:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[400px] left-[15%] size-[1100px] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, color-mix(in oklch, var(--accent) 22%, transparent) 0%, transparent 72%)",
          filter: "blur(14px)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-[1200px] flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <OperatoraWordmark />

        <div className="flex items-center gap-4">
          {isAuthed ? (
            <>
              <span className="hidden text-[13px] text-muted sm:inline">{user?.email}</span>
              <Button variant="secondary" onPress={() => router.push("/dashboard")}>
                Dashboard
              </Button>
            </>
          ) : (
            <>
              <span className="hidden text-[13px] text-muted sm:inline">Can I do this later?</span>
              <Button variant="secondary" onPress={() => router.push("/login")}>
                Skip
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative z-10 flex max-w-[820px] flex-col items-center gap-5">
        <span className="inline-flex h-7 items-center gap-2 rounded-full border border-foreground/[0.12] bg-foreground/[0.06] px-3">
          <span className="size-1.5 rounded-full bg-accent" />
          <span className="text-[11px] font-semibold tracking-[0.44px] text-foreground">{PRICING_BADGE}</span>
        </span>
        <h1 className="text-center text-[40px] font-semibold leading-none tracking-[-1.68px] text-foreground sm:text-[48px] lg:text-[56px]">
          {HERO_TITLE}
        </h1>
        <p className="max-w-[640px] text-center text-[15px] leading-[1.5] text-muted sm:text-[16px]">
          {HERO_SUBTITLE}
        </p>

        {isAuthed && billing ? (
          <div className="inline-flex flex-col items-center gap-2 rounded-[14px] border border-accent/35 bg-accent/10 px-4 py-2.5 sm:flex-row sm:gap-3">
            <span className="text-[13px] font-semibold text-accent">
              Your current plan: {billing.planName}
            </span>
            {billing.status ? <span className="text-[12px] font-medium text-muted">· {billing.status}</span> : null}
          </div>
        ) : null}

        <div className="inline-flex items-center gap-1 rounded-full border border-foreground/[0.08] bg-foreground/[0.06] p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`h-9 rounded-full px-4 text-[13px] font-medium transition-colors ${
              cycle === "monthly" ? "bg-accent font-semibold text-accent-foreground" : "text-muted"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors ${
              cycle === "yearly" ? "bg-accent text-accent-foreground" : "text-muted"
            }`}
          >
            Yearly
            <span
              className={`rounded-full px-[7px] py-0.5 text-[10px] font-semibold tracking-[0.2px] ${
                cycle === "yearly" ? "bg-accent-foreground/20 text-accent-foreground" : "bg-foreground/[0.1] text-muted"
              }`}
            >
              -20%
            </span>
          </button>
        </div>
      </div>

      <div className="relative z-10 grid w-full max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-3">
        <PlanCard
          name={PLAN_PRO.name}
          tagline={PLAN_PRO.tagline}
          price={DISPLAY_PRICES.pro[cycle]}
          priceSuffix={PRICE_SUFFIX[cycle]}
          trialLine="7-day money-back guarantee"
          ctaLabel={ctaLabel("pro", PLAN_PRO.ctaAuthed, PLAN_PRO.ctaGuest)}
          ctaVariant="primary"
          ctaDisabled={isAuthed && currentPlanSlug === "pro" && !needsRenew}
          isCurrent={isAuthed && currentPlanSlug === "pro" && !needsRenew}
          currentPlanBadge="CURRENT"
          features={[
            ...PLAN_PRO.features,
            { text: `Additional operator: ${OPERATOR_ADDON.pro[cycle]}`, muted: true },
          ]}
          onPress={() => pickPlan("pro")}
        />
        <PlanCard
          name={PLAN_MAX.name}
          badge={PLAN_MAX.badge}
          highlighted
          tagline={PLAN_MAX.tagline}
          price={DISPLAY_PRICES.max[cycle]}
          priceSuffix={PRICE_SUFFIX[cycle]}
          trialLine="7-day money-back guarantee"
          ctaLabel={ctaLabel("max", PLAN_MAX.ctaAuthed, PLAN_MAX.ctaGuest)}
          ctaVariant="primary"
          ctaDisabled={isAuthed && currentPlanSlug === "max" && !needsRenew}
          isCurrent={isAuthed && currentPlanSlug === "max" && !needsRenew}
          currentPlanBadge="CURRENT"
          features={[
            ...PLAN_MAX.features,
            { text: `Additional operator: ${OPERATOR_ADDON.max[cycle]}`, muted: true },
          ]}
          onPress={() => pickPlan("max")}
        />
        <PlanCard
          name={PLAN_CORPORATE.name}
          tagline={PLAN_CORPORATE.tagline}
          price={PLAN_CORPORATE.price ?? ""}
          priceSuffix={PLAN_CORPORATE.priceSuffix}
          ctaLabel={PLAN_CORPORATE.ctaGuest}
          ctaVariant="secondary"
          isCurrent={isAuthed && currentPlanSlug === "corporate"}
          currentPlanBadge="CURRENT"
          features={PLAN_CORPORATE.features}
          onPress={() => pickPlan("corporate")}
        />
      </div>

      <div className="relative z-10 -mt-4 flex w-full flex-col items-center gap-5">
        <button
          type="button"
          onClick={() => setShowFree((v) => !v)}
          aria-expanded={showFree}
          className="text-[13px] font-medium text-muted underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-accent"
        >
          Just want to try? View free plan
        </button>
        {showFree ? (
          <div className="w-full max-w-[380px]">
            <PlanCard
              name={PLAN_FREE.name}
              tagline={PLAN_FREE.tagline}
              price={PLAN_FREE.price ?? ""}
              priceSuffix={PLAN_FREE.priceSuffix}
              ctaLabel={ctaLabel("free", PLAN_FREE.ctaAuthed, PLAN_FREE.ctaGuest)}
              ctaVariant="secondary"
              ctaDisabled={isAuthed && currentPlanSlug === "free"}
              isCurrent={isAuthed && currentPlanSlug === "free"}
              currentPlanBadge="CURRENT"
              features={PLAN_FREE.features}
              onPress={() => pickPlan("free")}
            />
          </div>
        ) : null}
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-full border border-foreground/[0.06] bg-foreground/[0.03] px-7 py-3.5">
        <TrustItem label="No credit card required" />
        <TrustItem label="Cancel anytime" />
        <TrustItem label="SSL encrypted" />
        <TrustItem label="Payme · Click supported" />
      </div>

      <footer className="relative z-10 mt-2 w-full max-w-[1200px] border-t border-foreground/[0.06] pt-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <span className="text-[12px] text-muted/80">© {new Date().getFullYear()} Operatora LLC</span>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-medium text-muted">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/refund" className="transition-colors hover:text-foreground">
              Money-back guarantee
            </Link>
            <a href="mailto:sales@operatora.uz" className="transition-colors hover:text-foreground">
              Help
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function TrustItem({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="size-1.5 rounded-full bg-accent" />
      <span className="text-[13px] font-medium tracking-[0.26px] text-muted">{label}</span>
    </div>
  );
}
