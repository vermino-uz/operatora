"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLeadTimelineQuery } from "@/features/leads/hooks/useLeadTimeline";
import { useTeamMembersQuery } from "@/features/team/hooks/useTeamMembersQuery";
import { describeLeadLifecycleEvent } from "@/features/leads/types";

/** `lead_lifecycle_events` — read-only, DB-triggered journal. `actor_id`
 * resolves to a display name via the workspace's own Team Members list
 * (already fetched by the modal's Info tab); a `null` actor or one that
 * doesn't resolve (e.g. a system-driven change) renders with no "by ..."
 * suffix rather than a placeholder. */
export function LeadTimelineTab({
  leadId,
  workspaceId,
  isActive,
}: {
  leadId: string;
  workspaceId: string | null;
  isActive: boolean;
}) {
  const timelineQuery = useLeadTimelineQuery(leadId, isActive);
  const operatorsQuery = useTeamMembersQuery(workspaceId, {});
  const operatorsById = new Map((operatorsQuery.data ?? []).map((op) => [op.user_id, op.full_name || op.email]));

  if (timelineQuery.isLoading) return <LoadingState label="Loading activity…" />;
  if (timelineQuery.isError) return <ErrorState error={timelineQuery.error} onRetry={() => timelineQuery.refetch()} />;
  const events = timelineQuery.data ?? [];
  if (events.length === 0) return <EmptyState title="No activity recorded yet" />;

  return (
    <ol className="flex flex-col gap-3 border-l border-border pl-4">
      {events.map((event) => {
        const { title, detail } = describeLeadLifecycleEvent(
          event,
          event.actor_id ? (operatorsById.get(event.actor_id) ?? null) : null,
        );
        return (
          <li key={event.id} className="relative text-sm">
            <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-foreground/70">{detail}</p>
            <p className="text-xs text-foreground/40">
              {new Date(event.occurred_at).toLocaleString()}
              {event.is_inferred ? " · inferred from a snapshot" : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
