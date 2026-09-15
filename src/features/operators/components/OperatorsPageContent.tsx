"use client";

import { useMemo, useState } from "react";
import { Button, DateRangePicker, RangeCalendar, useOverlayState } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { Calendar, FileText } from "@gravity-ui/icons";

import { hasAnyRole, MANAGER_ROLES } from "@/auth/permissions";
import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useOperatorsQuery } from "@/features/operators/hooks/useOperatorsQuery";
import { useOperatorConversationsQuery } from "@/features/operators/hooks/useOperatorConversationsQuery";
import { conversationMatchesOperator, operatorDisplayName } from "@/features/operators/matchConversation";
import { OperatorCard, type OperatorMetrics } from "@/features/operators/components/OperatorCard";
import { EditOperatorModal } from "@/features/operators/components/EditOperatorModal";
import { SendFeedbackModal } from "@/features/operators/components/SendFeedbackModal";
import { AllFeedbacksModal } from "@/features/operators/components/AllFeedbacksModal";
import { OperatorConversationsModal } from "@/features/operators/components/OperatorConversationsModal";
import type { OperatorConversationRow, OperatorOverviewRow } from "@/features/operators/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateRangeLabel(from?: string, to?: string): string {
  if (!from) return "All time";
  if (to && to !== from) return `${from} — ${to}`;
  return from;
}

function computeMetrics(operator: OperatorOverviewRow, conversations: OperatorConversationRow[] | undefined): OperatorMetrics {
  const displayName = operatorDisplayName(operator);
  const matched = (conversations ?? []).filter((c) => conversationMatchesOperator(c, operator));

  const scored = matched.filter((c) => c.ai_score && c.ai_score > 0);
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((sum, c) => sum + (c.ai_score ?? 0), 0) / scored.length) : 0;

  const totalDurationSec = matched.reduce((sum, c) => sum + (c.duration_sec ?? 0), 0);
  const avgDurationSec = matched.length > 0 ? totalDurationSec / matched.length : 0;
  const avgDuration = `${Math.floor(avgDurationSec / 60)}:${String(Math.floor(avgDurationSec % 60)).padStart(2, "0")}`;

  const CONVERSION_MARKERS = ["conversion", "band qilish", "enrolled", "signed up", "registered"];
  const conversions = matched.filter((c) => CONVERSION_MARKERS.some((marker) => c.disposition?.includes(marker))).length;

  return {
    displayName,
    conversationsCount: matched.length,
    conversions,
    avgScore,
    avgDuration,
    totalHours: Math.round((totalDurationSec / 3600) * 10) / 10,
    active: matched.length > 0,
  };
}

/**
 * Operators (`/operators`) — reference: old frontend's `pages/
 * Operators.tsx` + `components/operators/*`. A performance leaderboard
 * over `GET /operators-page/operators` (roster) and `GET /operators-page/
 * conversations` (date-ranged call log), matched client-side by name/
 * email heuristics (see `matchConversation.ts` doc comment — the
 * `conversations` table has no FK to `operators`, this is real old-app
 * behavior, not a shortcut taken here).
 *
 * Edit/send-feedback actions are additionally gated to `MANAGER_ROLES`
 * (admin/demo_admin/super_admin/sales_manager) client-side, mirroring
 * the old page's `canEdit = userRoles.includes('admin') ||
 * userRoles.includes('sales_manager')` — sourced from the session's
 * already-fetched global `roles[]` rather than a second call to
 * `GET /operators-page/my-roles` (same underlying `user_roles` data,
 * no need for a duplicate request). This is UX only; the backend's own
 * admin/sales_manager checks on the write endpoints remain the real
 * authorization boundary.
 */
export function OperatorsPageContent() {
  const roles = useSessionStore((s) => s.roles);
  const canEdit = hasAnyRole(roles, MANAGER_ROLES);

  const [range, setRange] = useState<{ from?: string; to?: string }>({ from: todayIso(), to: todayIso() });
  const [editing, setEditing] = useState<OperatorOverviewRow | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<OperatorOverviewRow | null>(null);
  const [viewingConversations, setViewingConversations] = useState<OperatorOverviewRow | null>(null);

  const editState = useOverlayState();
  const feedbackState = useOverlayState();
  const conversationsState = useOverlayState();
  const allFeedbacksState = useOverlayState();

  const operatorsQuery = useOperatorsQuery();
  const conversationsQuery = useOperatorConversationsQuery(range);

  const cards = useMemo(() => {
    const operators = operatorsQuery.data ?? [];
    return operators.map((operator) => ({ operator, metrics: computeMetrics(operator, conversationsQuery.data) }));
  }, [operatorsQuery.data, conversationsQuery.data]);

  if (operatorsQuery.isLoading) {
    return <LoadingState label="Loading operators…" className="flex-1" />;
  }
  if (operatorsQuery.isError) {
    return (
      <div className="flex-1 p-6">
        <ErrorState error={operatorsQuery.error} onRetry={() => operatorsQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operators</h1>
          <p className="mt-1 text-sm text-foreground/60">Performance leaderboard across calls, AI score, and conversions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            aria-label="Date range"
            value={range.from && range.to ? { start: parseDate(range.from), end: parseDate(range.to) } : null}
            onChange={(value) =>
              setRange(value ? { from: value.start.toString(), to: value.end.toString() } : { from: undefined, to: undefined })
            }
          >
            <Button size="sm" variant="secondary" className="h-9 gap-2">
              <Calendar className="size-3.5" aria-hidden="true" />
              {formatDateRangeLabel(range.from, range.to)}
            </Button>
            <DateRangePicker.Popover>
              <RangeCalendar aria-label="Date range">
                <RangeCalendar.Header>
                  <RangeCalendar.YearPickerTrigger>
                    <RangeCalendar.YearPickerTriggerHeading />
                    <RangeCalendar.YearPickerTriggerIndicator />
                  </RangeCalendar.YearPickerTrigger>
                  <RangeCalendar.NavButton slot="previous" />
                  <RangeCalendar.NavButton slot="next" />
                </RangeCalendar.Header>
                <RangeCalendar.Grid>
                  <RangeCalendar.GridHeader>
                    {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                  </RangeCalendar.GridHeader>
                  <RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
                </RangeCalendar.Grid>
              </RangeCalendar>
            </DateRangePicker.Popover>
          </DateRangePicker>

          {canEdit ? (
            <Button size="sm" variant="secondary" onPress={() => allFeedbacksState.open()}>
              <FileText className="size-3.5" aria-hidden="true" />
              All feedback
            </Button>
          ) : null}
        </div>
      </div>

      {conversationsQuery.isError ? (
        <p className="mt-4 text-sm text-danger">
          Call metrics couldn&apos;t load for this range — operator cards below show 0s until this succeeds.{" "}
          <button type="button" className="underline" onClick={() => conversationsQuery.refetch()}>
            Retry
          </button>
        </p>
      ) : null}

      {cards.length === 0 ? (
        <div className="mt-16">
          <EmptyState title="No operators yet" description="Operators appear here once teammates are added to this workspace." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ operator, metrics }) => (
            <OperatorCard
              key={operator.id}
              operator={operator}
              metrics={metrics}
              canEdit={canEdit}
              onViewConversations={() => {
                setViewingConversations(operator);
                conversationsState.open();
              }}
              onEdit={() => {
                setEditing(operator);
                editState.open();
              }}
              onSendFeedback={() => {
                setFeedbackTarget(operator);
                feedbackState.open();
              }}
            />
          ))}
        </div>
      )}

      {editing ? (
        <EditOperatorModal
          state={editState}
          profileId={editing.id}
          operatorName={editing.operator_name || operatorDisplayName(editing)}
        />
      ) : null}

      {feedbackTarget ? (
        <SendFeedbackModal
          state={feedbackState}
          canApprove={canEdit}
          operatorName={feedbackTarget.operator_name || operatorDisplayName(feedbackTarget)}
        />
      ) : null}

      {viewingConversations ? (
        <OperatorConversationsModal
          state={conversationsState}
          operatorName={operatorDisplayName(viewingConversations)}
          aliases={{
            displayName: operatorDisplayName(viewingConversations),
            storedName: viewingConversations.operator_name ?? undefined,
            email: viewingConversations.email ?? undefined,
            fullName: viewingConversations.full_name ?? undefined,
          }}
        />
      ) : null}

      {canEdit ? <AllFeedbacksModal state={allFeedbacksState} canView={canEdit} /> : null}
    </div>
  );
}
