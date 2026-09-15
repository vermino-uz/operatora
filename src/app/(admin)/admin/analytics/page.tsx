"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminKpiCard } from "@/features/admin/components/AdminKpiCard";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";
import { formatNumber } from "@/features/admin/formatters";
import { useAdminAnalyticsOverviewQuery } from "@/features/admin/hooks/useAdminAnalytics";

/**
 * `/admin/analytics/overview` — real, confirmed against
 * `admin-analytics.controller.ts` (product usage events, distinct from AI
 * token usage). Not in ARCHITECTURE.md's original admin route list, but
 * live on the backend and in the old admin sidebar — ported per this
 * phase's "check whether it's real and worth porting" instruction. Kept
 * to the overview (totals + top events + top workspaces); the by-day and
 * raw-events-list endpoints exist (see `services/api/admin/analytics.ts`)
 * but are left unwired here to control scope, same simplification as
 * AI & Usage.
 */
export default function AdminAnalyticsPage() {
  const query = useAdminAnalyticsOverviewQuery({});

  if (query.isLoading) return <LoadingState label="Loading analytics…" className="py-16" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" />;
  const data = query.data;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-foreground/60">Product usage events, platform-wide.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <AdminKpiCard label="Events" value={formatNumber(data.totals.events)} />
        <AdminKpiCard label="Sessions" value={formatNumber(data.totals.uniqueSessions)} />
        <AdminKpiCard label="Users" value={formatNumber(data.totals.uniqueUsers)} />
        <AdminKpiCard label="Workspaces" value={formatNumber(data.totals.uniqueWorkspaces)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminSectionCard title="Top events">
          {data.topEvents.length === 0 ? (
            <EmptyState title="No events yet" />
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {data.topEvents.map((e) => (
                <li key={e.eventName} className="flex justify-between border-b border-divider/60 py-1.5 last:border-b-0">
                  <span className="text-foreground">{e.eventName}</span>
                  <span className="text-foreground/60">{formatNumber(e.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminSectionCard>
        <AdminSectionCard title="Top workspaces">
          {data.topWorkspaces.length === 0 ? (
            <EmptyState title="No events yet" />
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {data.topWorkspaces.map((w) => (
                <li key={w.workspaceId} className="flex justify-between border-b border-divider/60 py-1.5 last:border-b-0">
                  <span className="text-foreground">{w.workspaceName ?? w.workspaceId}</span>
                  <span className="text-foreground/60">{formatNumber(w.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}
