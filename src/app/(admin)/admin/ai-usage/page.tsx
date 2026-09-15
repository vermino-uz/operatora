"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";
import { AdminKpiCard } from "@/features/admin/components/AdminKpiCard";
import { formatNumber, formatUsdCents } from "@/features/admin/formatters";
import { useAdminAiUsageOverviewQuery } from "@/features/admin/hooks/useAdminAiUsage";
import { AI_FEATURE_LABELS } from "@/features/admin/types";

/** `/admin/ai-usage/overview` — real, confirmed against
 * `admin-ai-usage.controller.ts`. By-day/recent/workspace-drilldown
 * endpoints exist too (see `services/api/admin/aiUsage.ts`) but are kept
 * out of this pass to control scope — the overview alone (totals + top
 * workspaces + by model/feature) covers the page's main value and is real
 * data, not fabricated; noted as a depth simplification in PROGRESS.md. */
export default function AdminAiUsagePage() {
  const query = useAdminAiUsageOverviewQuery({});

  if (query.isLoading) return <LoadingState label="Loading AI usage…" className="py-16" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" />;
  const data = query.data;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI & Usage</h1>
        <p className="text-sm text-foreground/60">Platform-wide AI token spend, all-time window shown by the backend default.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <AdminKpiCard label="Requests" value={formatNumber(data.totals.requests)} />
        <AdminKpiCard label="Cost" value={formatUsdCents(data.totals.costUsdCents)} />
        <AdminKpiCard label="Input tokens" value={formatNumber(data.totals.inputTokens)} />
        <AdminKpiCard label="Output tokens" value={formatNumber(data.totals.outputTokens)} />
      </div>

      <AdminSectionCard title="Top workspaces">
        {data.topWorkspaces.length === 0 ? (
          <EmptyState title="No usage yet" />
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-divider text-xs text-foreground/60">
                <th className="px-2 py-2">Workspace</th>
                <th className="px-2 py-2">Requests</th>
                <th className="px-2 py-2">Cost</th>
                <th className="px-2 py-2">Top feature</th>
              </tr>
            </thead>
            <tbody>
              {data.topWorkspaces.map((w) => (
                <tr key={w.workspaceId} className="border-b border-divider/60">
                  <td className="px-2 py-2 text-foreground">{w.workspaceName ?? w.workspaceId}</td>
                  <td className="px-2 py-2 text-foreground/70">{formatNumber(w.requests)}</td>
                  <td className="px-2 py-2 text-foreground/70">{formatUsdCents(w.costUsdCents)}</td>
                  <td className="px-2 py-2 text-foreground/70">{w.topFeature ? AI_FEATURE_LABELS[w.topFeature] ?? w.topFeature : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminSectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminSectionCard title="By model">
          {data.byModels.length === 0 ? (
            <EmptyState title="No data" />
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {data.byModels.map((m) => (
                <li key={m.model} className="flex items-center justify-between border-b border-divider/60 py-2 last:border-b-0">
                  <span className="text-foreground">{m.model}</span>
                  <span className="text-foreground/60">
                    {formatNumber(m.requests)} req · {formatUsdCents(m.costUsdCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSectionCard>
        <AdminSectionCard title="By feature">
          {data.byFeatures.length === 0 ? (
            <EmptyState title="No data" />
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {data.byFeatures.map((f) => (
                <li key={f.feature} className="flex items-center justify-between border-b border-divider/60 py-2 last:border-b-0">
                  <span className="text-foreground">{f.label || AI_FEATURE_LABELS[f.feature] || f.feature}</span>
                  <span className="text-foreground/60">
                    {formatNumber(f.requests)} req · {formatUsdCents(f.costUsdCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}
