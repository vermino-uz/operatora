"use client";

import { Button } from "@heroui/react";
import { Check } from "@gravity-ui/icons";
import type { PlanFeature } from "@/features/billing/pricingContent";

/**
 * Single plan card for `/pricing` — restyled with this project's own dark
 * tokens (see `(auth)/layout.tsx`/`LegalPage.tsx` precedent) rather than the
 * old page's hardcoded `#011c1a`/`#c8ecd0` hex palette. Structure/content
 * (name, tagline, price, feature list, highlighted "agentic" row) ported
 * from `Pricing.tsx`'s own `PlanCard`.
 */
export function PlanCard({
  name,
  tagline,
  price,
  priceSuffix,
  badge,
  trialLine,
  ctaLabel,
  ctaVariant,
  ctaDisabled,
  highlighted = false,
  isCurrent = false,
  currentPlanBadge,
  features,
  onPress,
}: {
  name: string;
  tagline: string;
  price: string;
  priceSuffix: string;
  badge?: string;
  trialLine?: string;
  ctaLabel: string;
  ctaVariant: "primary" | "secondary";
  ctaDisabled?: boolean;
  highlighted?: boolean;
  isCurrent?: boolean;
  currentPlanBadge?: string;
  features: PlanFeature[];
  onPress: () => void;
}) {
  const showHighlight = highlighted || isCurrent;

  return (
    <div
      className={`flex flex-col gap-6 rounded-[24px] px-7 py-8 ${
        showHighlight
          ? "border-[1.5px] border-accent/60 bg-accent/[0.08] shadow-[0px_20px_50px_-10px_rgba(0,0,0,0.35)]"
          : "border border-foreground/[0.08] bg-foreground/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[20px] font-semibold tracking-[-0.4px] text-foreground">{name}</p>
          <p className="text-[13px] leading-[1.5] text-muted">{tagline}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isCurrent && currentPlanBadge ? (
            <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-[5px] text-[10px] font-semibold tracking-[0.4px] text-accent-foreground">
              {currentPlanBadge}
            </span>
          ) : badge ? (
            <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-[5px] text-[10px] font-semibold tracking-[0.4px] text-accent-foreground">
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <p className="text-[44px] font-semibold leading-none tracking-[-1.56px] text-foreground sm:text-[52px]">
          {price}
        </p>
        <p className="pb-3 text-[13px] font-medium text-muted">{priceSuffix}</p>
      </div>

      {trialLine ? (
        <div className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent" />
          <span className="text-[12px] font-medium tracking-[0.24px] text-accent">{trialLine}</span>
        </div>
      ) : null}

      <Button
        variant={ctaVariant === "primary" ? "primary" : "secondary"}
        isDisabled={ctaDisabled}
        onPress={onPress}
        className="h-[52px] w-full rounded-[14px] text-[14px] font-semibold"
      >
        {ctaLabel}
      </Button>

      <div className="h-px w-full bg-foreground/[0.08]" />

      <ul className="flex flex-col gap-3">
        {features.map((f) =>
          f.highlight ? (
            <li key={f.text}>
              <div className="relative flex items-start gap-3 rounded-[14px] border border-accent/45 bg-accent/10 px-3.5 py-3 shadow-[0_0_34px_-10px_rgba(0,0,0,0.2)]">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/20 text-[15px] text-accent">
                  ✦
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-foreground">{f.text}</span>
                    {f.pill ? (
                      <span className="inline-flex items-center rounded-full bg-accent px-1.5 py-[2px] text-[9px] font-semibold tracking-[0.3px] text-accent-foreground">
                        {f.pill}
                      </span>
                    ) : null}
                  </div>
                  {f.subtitle ? <span className="text-[11px] leading-[1.45] text-muted">{f.subtitle}</span> : null}
                </div>
              </div>
            </li>
          ) : (
            <li key={f.text} className="flex items-start gap-2.5">
              <span className="inline-flex h-5 w-4 shrink-0 items-center justify-center text-accent">
                {f.muted ? null : <Check className="size-3" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[13px] leading-[1.5] ${f.muted ? "text-muted" : "text-foreground"} ${
                      f.strong ? "font-semibold" : "font-normal"
                    }`}
                  >
                    {f.text}
                  </span>
                  {f.pill ? (
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-[2px] text-[9px] font-semibold tracking-[0.3px] ${
                        f.pillTone === "amber"
                          ? "bg-warning/15 text-warning ring-1 ring-inset ring-warning/25"
                          : f.pillTone === "muted"
                            ? "bg-foreground/[0.08] text-muted ring-1 ring-inset ring-foreground/[0.08]"
                            : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {f.pill}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
