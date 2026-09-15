"use client";

import Link from "next/link";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAdminOverviewQuery } from "@/features/admin/hooks/useAdminOverview";
import { AdminKpiCard } from "@/features/admin/components/AdminKpiCard";
import { daysUntil, formatBytes, formatRelative, formatUsdCents } from "@/features/admin/formatters";

/**
 * `GET /admin/overview` — real, confirmed against
 * `admin-overview.service.ts` (see PROGRESS.md Phase 2l). Ported from the
 * old `pages/Overview.tsx`'s KPI/alerts/recent-activity/trials-expiring
 * layout, re-skinned with this repo's plain-table/EmptyState conventions
 * instead of shadcn cards; export-CSV/broadcast/"new workspace" buttons
 * from the old page were UI-only stubs there too (no handler) and are
 * dropped rather than ported as dead buttons.
 */
export default function AdminOverviewPage() {
  const query = useAdminOverviewQuery();

  if (query.isLoading) return <LoadingState label="Loading admin overview…" className="py-16" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" />;

  const data = query.data;
  if (!data) return null;

  const alerts = [
    data.alerts.trialsExpiringSoon.length > 0
      ? { key: "trials", title: `${data.alerts.trialsExpiringSoon.length} trial(s) expiring within 3 days`, href: "/admin/workspaces?status=trialing" }
      : null,
    data.alerts.criticalFeedback > 0
      ? { key: "feedback", title: `${data.alerts.criticalFeedback} critical feedback open`, href: "/admin/feedback" }
      : null,
    data.alerts.failedIntegrations > 0
      ? { key: "integrations", title: `${data.alerts.failedIntegrations} integration(s) inactive`, href: "/admin/integrations?status=inactive" }
      : null,
    data.alerts.lockedUsers > 0
      ? { key: "locked", title: `${data.alerts.lockedUsers} user(s) locked`, href: "/admin/users?status=locked" }
      : null,
  ].filter((a): a is { key: string; title: string; href: string } => a !== null);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Admin console</h1>
        <p className="text-sm text-foreground/60">
          {data.kpis.workspaces.total} workspaces · {data.kpis.users.total} users
          {alerts.length > 0 ? ` · ${alerts.length} alert(s)` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          label="Total workspaces"
          value={data.kpis.workspaces.total}
          sub={`${data.kpis.workspaces.active} active · ${data.kpis.workspaces.trialing} trial · ${data.kpis.workspaces.suspended} suspended`}
        />
        <AdminKpiCard
          label="Total users"
          value={data.kpis.users.total}
          sub={`${data.kpis.users.active} active · ${data.kpis.users.locked} locked`}
        />
        <AdminKpiCard
          label="AI spend (30d)"
          value={formatUsdCents(data.kpis.aiSpend30d.usdCents)}
          sub={`OpenAI ${formatUsdCents(data.kpis.aiSpend30d.openai)} · Gemini ${formatUsdCents(data.kpis.aiSpend30d.gemini)}`}
        />
        <AdminKpiCard label="Storage used" value={formatBytes(data.kpis.storage.bytes)} sub="Audio + images" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-divider bg-background">
          <div className="flex items-center justify-between border-b border-divider px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Alerts</h2>
            <Link href="/admin/audit-logs" className="text-xs text-foreground/60 hover:text-foreground">
              All →
            </Link>
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-foreground/50">Nothing needs attention.</p>
          ) : (
            <ul>
              {alerts.map((a) => (
                <li key={a.key} className="flex items-center justify-between border-b border-divider/60 px-4 py-3 last:border-b-0">
                  <span className="text-sm text-foreground">{a.title}</span>
                  <Link href={a.href} className="rounded-md border border-divider px-2 py-1 text-xs text-foreground/70 hover:bg-foreground/5">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-divider bg-background">
          <div className="flex items-center justify-between border-b border-divider px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
            <Link href="/admin/audit-logs" className="text-xs text-foreground/60 hover:text-foreground">
              All →
            </Link>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-foreground/50">No activity yet.</p>
          ) : (
            <ul>
              {data.recentActivity.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 border-b border-divider/60 px-4 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {a.actorEmail ?? "system"} <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px]">{a.action}</span>
                    </p>
                    <p className="truncate text-xs text-foreground/50">
                      {a.entityType}
                      {a.entityId ? ` · ${a.entityId.slice(0, 8)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-foreground/40">{formatRelative(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {data.alerts.trialsExpiringSoon.length > 0 ? (
        <div className="rounded-xl border border-divider bg-background">
          <div className="border-b border-divider px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Trials ending soon</h2>
          </div>
          <ul>
            {data.alerts.trialsExpiringSoon.map((t) => {
              const days = daysUntil(t.trialEndsAt);
              return (
                <li key={t.workspaceId} className="border-b border-divider/60 last:border-b-0">
                  <Link href={`/admin/workspaces/${t.workspaceId}`} className="flex items-center justify-between px-4 py-3 hover:bg-foreground/5">
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                    <span className={`text-xs ${days !== null && days <= 1 ? "text-danger" : "text-warning"}`}>
                      {days !== null && days > 0 ? `${days}d left` : "expired"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
