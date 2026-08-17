"use client";

import { useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { CircleInfo, CreditCard, HandPointUp, Sparkles, Target } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/types/api";
import { useAdsCampaignsQuery, useAdsConnectMutation, useAdsStatusQuery, useSetCampaignStatusMutation } from "@/features/ads/hooks/useAds";
import { formatMoney, type AdsBillingMode, type AdsCampaign } from "@/features/ads/types";
import { AdsCampaignRow } from "@/features/ads/components/AdsCampaignRow";
import { AdsCopilotPanel } from "@/features/ads/components/AdsCopilotPanel";
import { ManageCampaignDialog } from "@/features/ads/components/ManageCampaignDialog";
import { ActivateCampaignDialog } from "@/features/ads/components/ActivateCampaignDialog";

/**
 * Ads (BETA) — reference: old frontend's `pages/Ads.tsx`. RBAC-gated by the
 * `ads` module server-side (`GET /ads/status`/`GET /ads/campaigns` need
 * `view`, every mutation needs `manage` — additionally workspace-owner/
 * admin-only inside the service, see `features/ads/types.ts`'s doc
 * comment). Real Meta Ads API access is behind Meta's own Advanced Access
 * review; until granted, `GET /ads/campaigns` returns honest sample data
 * (`sample: true`) — this page never hides that fact.
 *
 * Not built here (per the old frontend's own reference — real endpoints
 * with no matching UI in old, not reproduced here either): `POST /ads/
 * schedule` (no schedule editor exists anywhere in the old frontend to
 * port). `NewTargetDialog`'s multi-step "new target" wizard — confirmed by
 * reading it in full that it calls **no backend endpoint at all**; step 3
 * is a client-only preview that closes without writing anything (the old
 * frontend's own design: an honest "here's what would happen" walkthrough
 * given Advanced Access isn't live, explicitly not a fake "created"
 * message). Reproducing a decorative wizard with zero real effect isn't
 * worth the surface area for this pass — flagged, not silently dropped.
 */
export default function AdsPage() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [managing, setManaging] = useState<AdsCampaign | null>(null);
  const [activating, setActivating] = useState<AdsCampaign | null>(null);

  const statusQuery = useAdsStatusQuery();
  const campaignsQuery = useAdsCampaignsQuery();
  const connectMutation = useAdsConnectMutation();
  const setStatus = useSetCampaignStatusMutation();

  const campaigns = useMemo(() => campaignsQuery.data?.campaigns ?? [], [campaignsQuery.data]);
  const isSample = campaignsQuery.data?.sample ?? true;

  const totals = useMemo(
    () =>
      campaigns.reduce(
        (acc, c) => ({
          spend: acc.spend + (c.metrics?.spend ?? 0),
          results: acc.results + (c.metrics?.results ?? 0),
          clicks: acc.clicks + (c.metrics?.clicks ?? 0),
        }),
        { spend: 0, results: 0, clicks: 0 },
      ),
    [campaigns],
  );

  const handleConnect = (mode: AdsBillingMode) => {
    connectMutation.mutate(mode, {
      onSuccess: (res) => {
        if (res.authorizeUrl) window.location.href = res.authorizeUrl;
      },
    });
  };

  const handleToggle = (c: AdsCampaign) => {
    if (setStatus.isPending) return; // guard double-submit while a pause is in flight
    if (c.status === "active") {
      setStatus.mutate({ campaignId: c.id, status: "paused" });
    } else {
      setActivating(c);
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="No workspace selected" description="Sign in to a workspace to view Ads." />
      </div>
    );
  }

  if (statusQuery.isError) {
    const forbidden = statusQuery.error instanceof ApiError && statusQuery.error.isForbidden;
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title={forbidden ? "You don't have access to Ads" : "Couldn't load Ads"}
          description={forbidden ? "Ask a workspace owner or admin to grant you access to this module." : "Something went wrong."}
          action={
            !forbidden ? (
              <Button variant="secondary" size="sm" onPress={() => statusQuery.refetch()}>
                Retry
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const status = statusQuery.data;
  const connectDisabled = connectMutation.isPending;

  return (
    <div className="flex h-full min-h-0">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Ads
                <Chip size="sm" variant="soft">
                  <Chip.Label>Beta</Chip.Label>
                </Chip>
              </h1>
              <p className="text-sm text-foreground/60">Manage your Instagram/Facebook ad campaigns.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onPress={() => setCopilotOpen((v) => !v)}>
                <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
                Copilot
              </Button>
            </div>
          </div>

          {isSample ? (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-black/[0.08] px-4 py-3 sm:flex-row sm:items-center dark:border-white/[0.12]">
              <CircleInfo className="h-4 w-4 shrink-0 text-foreground/40" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">You&apos;re viewing sample data</p>
                <p className="text-xs text-foreground/60">
                  Real campaign management requires Meta&apos;s Advanced Access review. Connect below to start that process.
                </p>
              </div>
            </div>
          ) : null}

          {isSample ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={connectDisabled}
                onClick={() => handleConnect("managed")}
                className="rounded-xl border border-black/[0.08] p-3.5 text-left transition-colors hover:border-foreground/30 disabled:opacity-50 dark:border-white/[0.12]"
              >
                <p className="text-sm font-semibold text-foreground">Operatora manages it</p>
                <p className="mt-0.5 text-xs leading-[18px] text-foreground/60">
                  We run your ads for a {status?.commissionPercent ?? 15}% service fee.
                </p>
              </button>
              <button
                type="button"
                disabled={connectDisabled}
                onClick={() => handleConnect("own")}
                className="rounded-xl border border-black/[0.08] p-3.5 text-left transition-colors hover:border-foreground/30 disabled:opacity-50 dark:border-white/[0.12]"
              >
                <p className="text-sm font-semibold text-foreground">Connect your own ad account</p>
                <p className="mt-0.5 text-xs leading-[18px] text-foreground/60">You keep full control and billing.</p>
              </button>
            </div>
          ) : null}

          {connectMutation.data && !connectMutation.data.authorizeUrl ? (
            <p role="status" className="mt-2 text-xs text-foreground/60">
              {connectMutation.data.message ?? "Real ad-account connection isn't available yet."}
            </p>
          ) : null}

          {connectMutation.isError ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {connectMutation.error instanceof ApiError ? connectMutation.error.message : "Couldn't start the connection. Please try again."}
            </p>
          ) : null}

          {!isSample && status?.connected ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-black/[0.08] px-4 py-2.5 dark:border-white/[0.12]">
              <div className="flex min-w-0 items-center gap-2.5">
                {status.instagramProfilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external Meta CDN avatar
                  <img src={status.instagramProfilePictureUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground/60">
                    Connected as {status.billingMode === "managed" ? "Operatora-managed" : "your own account"}
                  </p>
                  {status.pageName || status.instagramUsername ? (
                    <p className="truncate text-[11px] text-foreground/40">
                      {status.pageName}
                      {status.pageName && status.instagramUsername ? " · " : ""}
                      {status.instagramUsername ? `@${status.instagramUsername}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleConnect(status.billingMode ?? "own")}
                className="shrink-0 text-xs font-medium text-accent hover:underline"
              >
                Reconnect
              </button>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-black/[0.08] px-4 py-3 dark:border-white/[0.12]">
              <div className="flex items-center gap-2 text-foreground/40">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="text-xs">Spend</span>
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatMoney(totals.spend)}</p>
            </div>
            <div className="rounded-xl border border-black/[0.08] px-4 py-3 dark:border-white/[0.12]">
              <div className="flex items-center gap-2 text-foreground/40">
                <Target className="h-3.5 w-3.5" />
                <span className="text-xs">Results</span>
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatMoney(totals.results)}</p>
            </div>
            <div className="rounded-xl border border-black/[0.08] px-4 py-3 dark:border-white/[0.12]">
              <div className="flex items-center gap-2 text-foreground/40">
                <HandPointUp className="h-3.5 w-3.5" />
                <span className="text-xs">Clicks</span>
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatMoney(totals.clicks)}</p>
            </div>
          </div>

          {setStatus.isError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {setStatus.error instanceof ApiError ? setStatus.error.message : "Couldn't pause the campaign. Please try again."}
            </p>
          ) : null}

          <div className="mt-3 overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
            <div className="flex h-10 items-center gap-3 border-b border-black/[0.08] bg-black/[0.015] px-3 dark:border-white/[0.12] dark:bg-white/[0.02] sm:px-4">
              <span className="w-6 shrink-0" />
              <span className="w-7 shrink-0" />
              <p className="min-w-0 flex-1 text-[11px] font-medium uppercase tracking-wide text-foreground/40">Campaign</p>
              <p className="hidden w-[120px] text-right text-[11px] font-medium uppercase tracking-wide text-foreground/40 sm:block">Budget</p>
              <p className="hidden w-[90px] text-right text-[11px] font-medium uppercase tracking-wide text-foreground/40 md:block">Results</p>
              <p className="w-[110px] text-right text-[11px] font-medium uppercase tracking-wide text-foreground/40">Spend</p>
              <span className="w-[76px] shrink-0" />
            </div>
            {campaignsQuery.isLoading ? (
              <LoadingState label="Loading campaigns…" />
            ) : campaignsQuery.isError ? (
              <ErrorState error={campaignsQuery.error} onRetry={() => campaignsQuery.refetch()} />
            ) : campaigns.length === 0 ? (
              <div className="py-10 text-center text-sm text-foreground/50">No campaigns yet.</div>
            ) : (
              campaigns.map((c) => <AdsCampaignRow key={c.id} campaign={c} onManage={setManaging} onToggle={handleToggle} />)
            )}
          </div>
        </div>
      </div>

      <AdsCopilotPanel campaigns={campaigns} isSample={isSample} workspaceId={workspaceId} open={copilotOpen} onClose={() => setCopilotOpen(false)} />

      {managing ? <ManageCampaignDialog campaign={managing} onClose={() => setManaging(null)} /> : null}
      {activating ? <ActivateCampaignDialog campaign={activating} onClose={() => setActivating(null)} /> : null}
    </div>
  );
}
