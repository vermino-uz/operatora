"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useFinanceAnalyticsQuery } from "@/features/finance/hooks/useFinance";
import { formatUZS, formatUZSCompact } from "@/features/finance/utils";

function MetricCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-foreground/50">{description}</p>
    </div>
  );
}

export function FinanceAnalyticsTab({ workspaceId }: { workspaceId: string }) {
  const query = useFinanceAnalyticsQuery(workspaceId);

  if (query.isLoading) return <LoadingState label="Loading analytics…" className="py-16" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" />;

  const m = query.data;
  if (!m) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Expected revenue" value={formatUZSCompact(m.expectedRevenue)} description="This month, based on active enrollments" />
        <MetricCard title="Collected this month" value={formatUZSCompact(m.collectedThisMonth)} description={`${m.monthlyGrowth.toFixed(1)}% vs last month`} />
        <MetricCard title="Outstanding" value={formatUZSCompact(m.outstandingThisMonth)} description="Expected minus collected" />
        <MetricCard title="Collection rate" value={`${m.collectionRate.toFixed(1)}%`} description="Collected / expected" />
        <MetricCard title="Active members" value={String(m.totalActiveMembers)} description="Across all active groups" />
        <MetricCard title="Course payments" value={formatUZSCompact(m.coursePaymentsThisMonth)} description="One-time course fees this month" />
        <MetricCard title="Monthly expenses" value={formatUZSCompact(m.monthlyExpenses)} description="Recorded this month" />
        <MetricCard
          title="Net this month"
          value={formatUZSCompact(m.collectedThisMonth + m.coursePaymentsThisMonth - m.monthlyExpenses)}
          description="Collected + course payments − expenses"
        />
      </div>

      <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
        <p className="mb-3 text-sm font-medium text-foreground">Collection progress</p>
        <div className="h-3 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${Math.min(m.collectionRate, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-foreground/60">
          <span>Collected: {formatUZS(m.collectedThisMonth)}</span>
          <span>Outstanding: {formatUZS(m.outstandingThisMonth)}</span>
        </div>
      </div>
    </div>
  );
}
