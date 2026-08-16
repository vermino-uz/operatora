"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useLeadStatsQuery } from "@/features/leads/hooks/useLeadStats";

/** `lead-stats.controller.ts` — every counter here is live-aggregated
 * server-side (see that controller's own doc comment); nothing is
 * fabricated or computed client-side. */
export function LeadStatsTab({
  leadId,
  workspaceId,
  isActive,
}: {
  leadId: string;
  workspaceId: string | null;
  isActive: boolean;
}) {
  const statsQuery = useLeadStatsQuery(leadId, workspaceId, isActive);

  if (statsQuery.isLoading) return <LoadingState label="Loading stats…" />;
  if (statsQuery.isError) return <ErrorState error={statsQuery.error} onRetry={() => statsQuery.refetch()} />;
  const stats = statsQuery.data;
  if (!stats) return null;

  const cards: { label: string; value: string | number }[] = [
    { label: "Days in pipeline", value: stats.days_in_pipeline },
    { label: "Status", value: stats.is_closed ? "Closed" : "Open" },
    { label: "Calls", value: stats.calls_count },
    { label: "Notes", value: stats.notes_count },
    { label: "Tasks closed", value: stats.tasks_closed },
    { label: "Tasks overdue", value: stats.tasks_overdue },
    { label: "Client chats", value: stats.client_chats_count },
    { label: "Internal mentions", value: stats.internal_mentions_count },
  ];
  if (stats.checklist_total > 0) {
    cards.push({ label: "Checklist", value: `${stats.checklist_filled}/${stats.checklist_total}` });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border p-3">
          <p className="text-xs text-foreground/50">{card.label}</p>
          <p className="text-lg font-semibold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
