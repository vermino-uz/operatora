"use client";

import { useState } from "react";
import { Tabs } from "@heroui/react";

import { useSessionStore } from "@/state/session-store";
import { useBillingFeaturesQuery } from "@/features/team/hooks/useBilling";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { OverviewTab } from "@/features/billing/components/OverviewTab";
import { InvoicesTab } from "@/features/billing/components/InvoicesTab";
import { PaymentCardsTab } from "@/features/billing/components/PaymentCardsTab";
import { BalanceTab } from "@/features/billing/components/BalanceTab";

type TabId = "overview" | "invoices" | "cards" | "balance";

/**
 * Billing & Usage — traced from the old frontend's `BillingUsagePanel.tsx`
 * (plan/usage summary + invoices) plus its two sub-panels
 * `PaymentCardsPanel.tsx`/`WorkspaceBalancePanel.tsx`, against the real
 * `billing.controller.ts`. Plan/usage/balance summary reuses the
 * already-built `GET /billing/me` (`useBillingFeaturesQuery`, extended for
 * this section — see `features/team/types.ts`), already consumed by Team
 * Members' seat panel and File Storage's usage bar; nothing duplicated.
 *
 * Deliberately deferred (real endpoints, out of scope for this pass, not
 * fabricated): full plan upgrade/downgrade comparison + new-subscription
 * checkout (`POST /billing/subscriptions`, `renew-quote`) — the old
 * frontend itself only links out to `/pricing` for this, this app mirrors
 * that with the same `/checkout?cycle=yearly` link Team Members'
 * `UpgradeToProBanner` already established, rather than building a second
 * plan-comparison UI; Eskiz wallet top-up (`POST /billing/eskiz/top-up`,
 * already built under the Eskiz settings section); operator-seat
 * rent/charge (already built under Team Members — this section only adds
 * "decline a vacant seat" on a pending renewal invoice, which Team
 * Members never exposed).
 */
export function BillingSettingsPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [tab, setTab] = useState<TabId>("overview");
  const billingQuery = useBillingFeaturesQuery(workspaceId);

  const shellProps = {
    title: "Billing & Usage",
    subtitle: "View your plan, AI usage limits, invoices, payment cards, and balance.",
    wide: true,
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  if (billingQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading billing details…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (billingQuery.isError || !billingQuery.data) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={billingQuery.error} onRetry={() => billingQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  return (
    <SettingsSectionShell {...shellProps}>
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as TabId)}>
        <Tabs.List>
          <Tabs.Tab id="overview">Overview</Tabs.Tab>
          <Tabs.Tab id="invoices">Invoices</Tabs.Tab>
          <Tabs.Tab id="cards">Payment cards</Tabs.Tab>
          <Tabs.Tab id="balance">Balance</Tabs.Tab>
        </Tabs.List>

        <div className="pt-5">
          <Tabs.Panel id="overview">
            <OverviewTab billing={billingQuery.data} onGoInvoices={() => setTab("invoices")} />
          </Tabs.Panel>
          <Tabs.Panel id="invoices">
            <InvoicesTab workspaceId={workspaceId} />
          </Tabs.Panel>
          <Tabs.Panel id="cards">
            <PaymentCardsTab workspaceId={workspaceId} />
          </Tabs.Panel>
          <Tabs.Panel id="balance">
            <BalanceTab workspaceId={workspaceId} />
          </Tabs.Panel>
        </div>
      </Tabs>
    </SettingsSectionShell>
  );
}
