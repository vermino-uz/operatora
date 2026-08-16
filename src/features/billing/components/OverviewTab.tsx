"use client";

import Link from "next/link";
import { Chip } from "@heroui/react";
import { ArrowUpRight } from "@gravity-ui/icons";

import type { BillingFeatures } from "@/features/team/types";

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const hasLimit = typeof limit === "number" && limit > 0;
  const pct = hasLimit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const atLimit = hasLimit && used >= limit;
  return (
    <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className={`text-xs font-medium ${atLimit ? "text-danger" : "text-foreground/50"}`}>
          {used.toLocaleString()} / {hasLimit ? limit!.toLocaleString() : "∞"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? "bg-danger" : "bg-primary"}`}
          style={{ width: hasLimit ? `${pct}%` : "6%" }}
        />
      </div>
    </div>
  );
}

const ACCESS_LABEL: Record<BillingFeatures["access"], { text: string; color: "success" | "warning" | "danger" }> = {
  full: { text: "Active", color: "success" },
  grace: { text: "Grace period — renew soon", color: "warning" },
  read_only: { text: "Expired — read only", color: "danger" },
};

export function OverviewTab({ billing, onGoInvoices }: { billing: BillingFeatures; onGoInvoices: () => void }) {
  const access = ACCESS_LABEL[billing.access];
  const endsLabel = billing.subscriptionEndsAt
    ? new Date(billing.subscriptionEndsAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;
  const needsRenew = billing.access === "grace" || billing.access === "read_only";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
        <div>
          <p className="text-xs font-semibold tracking-wide text-foreground/50 uppercase">Current plan</p>
          <p className="mt-1 text-xl font-bold capitalize">{billing.planName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip size="sm" color={access.color} variant="soft">
              <Chip.Label>{access.text}</Chip.Label>
            </Chip>
            {billing.periodKey ? <span className="text-xs text-foreground/50">Period {billing.periodKey}</span> : null}
            {endsLabel ? <span className="text-xs text-foreground/50">· Ends {endsLabel}</span> : null}
          </div>
        </div>
        {needsRenew ? (
          <button
            type="button"
            onClick={onGoInvoices}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
          >
            Renew now
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <Link
            href="/checkout?cycle=yearly"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
          >
            Upgrade plan
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <UsageBar label="Calls this period" used={billing.usage.calls_per_month ?? 0} limit={billing.limits.calls_per_month} />
        <UsageBar label="AI chat messages" used={billing.usage.ai_chat_messages ?? 0} limit={billing.limits.ai_chat_messages} />
        <UsageBar label="Storage (MB)" used={billing.usage.storage_mb} limit={billing.limits.storage_mb} />
        <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
          <p className="text-sm font-semibold">Operator seats</p>
          <p className="mt-2 text-xs text-foreground/50">
            {billing.limits.max_operators == null ? "Unlimited included" : `${billing.limits.max_operators} included`}
            {billing.extra_operator_seats > 0 ? ` + ${billing.extra_operator_seats} premium (rented)` : ""}
          </p>
          <p className="mt-1 text-xs text-foreground/40">Manage seats under Team Members.</p>
        </div>
      </div>

      {billing.channels && billing.channels.length > 0 ? (
        <div className="rounded-xl border border-black/[0.08] p-4 text-sm text-foreground/70 dark:border-white/[0.12]">
          <span className="font-semibold text-foreground">Channels: </span>
          {billing.channels.join(", ")}
          {billing.agentic_mode ? " · Agentic mode enabled" : ""}
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-foreground/50">
        Usage counters reset each billing period. Contact support if a limit needs a one-off exception.
      </p>
    </div>
  );
}
