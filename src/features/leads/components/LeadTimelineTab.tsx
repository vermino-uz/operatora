"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLeadTimelineQuery } from "@/features/leads/hooks/useLeadTimeline";
import { useLeadAiAutofillEventsQuery } from "@/features/leads/hooks/useLeadAiAutofillEvents";
import { useLeadsBoardsQuery } from "@/features/leads-boards/hooks/useLeadsBoards";
import { useTeamMembersQuery } from "@/features/team/hooks/useTeamMembersQuery";
import { describeLeadAiAutofillEvent, describeLeadLifecycleEvent } from "@/features/leads/types";

type TimelineRow =
  | { kind: "lifecycle"; id: string; at: string; title: string; detail: string; isInferred: boolean }
  | { kind: "ai_autofill"; id: string; at: string; title: string; detail: string };

/** `lead_lifecycle_events` (read-only, DB-triggered journal) merged with
 * `lead_ai_autofill_events` (append-only, written only by the backend's
 * `CallCustomFieldAutofillService`) into one chronological feed, plus a
 * status line reading the board's `ai_autofill_custom_fields_from_calls`
 * flag so it's visible whether the mode is even on for this lead's board —
 * `actor_id` resolves to a display name via the workspace's own Team
 * Members list (already fetched by the modal's Info tab); a `null` actor or
 * one that doesn't resolve (e.g. a system-driven change) renders with no
 * "by ..." suffix rather than a placeholder. */
export function LeadTimelineTab({
  leadId,
  workspaceId,
  boardId,
  isActive,
}: {
  leadId: string;
  workspaceId: string | null;
  boardId: string | null;
  isActive: boolean;
}) {
  const timelineQuery = useLeadTimelineQuery(leadId, isActive);
  const autofillEventsQuery = useLeadAiAutofillEventsQuery(leadId, isActive);
  const boardsQuery = useLeadsBoardsQuery(workspaceId, isActive);
  const operatorsQuery = useTeamMembersQuery(workspaceId, {});
  const operatorsById = new Map((operatorsQuery.data ?? []).map((op) => [op.user_id, op.full_name || op.email]));

  const board = (boardsQuery.data ?? []).find((b) => b.id === boardId);
  const autofillEnabled = !!board?.ai_autofill_custom_fields_from_calls;

  if (timelineQuery.isLoading || autofillEventsQuery.isLoading) return <LoadingState label="Loading activity…" />;
  if (timelineQuery.isError) return <ErrorState error={timelineQuery.error} onRetry={() => timelineQuery.refetch()} />;
  if (autofillEventsQuery.isError)
    return <ErrorState error={autofillEventsQuery.error} onRetry={() => autofillEventsQuery.refetch()} />;

  const lifecycleRows: TimelineRow[] = (timelineQuery.data ?? []).map((event) => {
    const { title, detail } = describeLeadLifecycleEvent(
      event,
      event.actor_id ? (operatorsById.get(event.actor_id) ?? null) : null,
    );
    return { kind: "lifecycle", id: event.id, at: event.occurred_at, title, detail, isInferred: event.is_inferred };
  });
  const autofillRows: TimelineRow[] = (autofillEventsQuery.data ?? []).map((event) => {
    const { title, detail } = describeLeadAiAutofillEvent(event);
    return { kind: "ai_autofill", id: event.id, at: event.created_at, title, detail };
  });
  const rows = [...lifecycleRows, ...autofillRows].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-medium border border-border bg-default-50 px-3 py-2 text-sm">
        <span className={`size-2 shrink-0 rounded-full ${autofillEnabled ? "bg-success" : "bg-default-300"}`} />
        <span className="text-foreground/70">
          AI auto-fill from call summaries is{" "}
          <span className={`font-medium ${autofillEnabled ? "text-success" : "text-foreground"}`}>
            {autofillEnabled ? "ON" : "OFF"}
          </span>{" "}
          for this board.
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No activity recorded yet" />
      ) : (
        <ol className="flex flex-col gap-3 border-l border-border pl-4">
          {rows.map((row) => (
            <li key={`${row.kind}-${row.id}`} className="relative text-sm">
              <span
                className={`absolute -left-[21px] top-1 size-2 rounded-full ${
                  row.kind === "ai_autofill" ? "bg-secondary" : "bg-primary"
                }`}
              />
              <p className="font-medium text-foreground">{row.title}</p>
              <p className="text-foreground/70">{row.detail}</p>
              <p className="text-xs text-foreground/40">
                {new Date(row.at).toLocaleString()}
                {row.kind === "lifecycle" && row.isInferred ? " · inferred from a snapshot" : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
