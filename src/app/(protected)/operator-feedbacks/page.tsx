"use client";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { canViewOperatorFeedbacksPage } from "@/features/operators/permissions";
import { OperatorFeedbacksPageContent } from "@/features/operators/components/OperatorFeedbacksPageContent";

/** `/operator-feedbacks` — see `OperatorFeedbacksPageContent`'s doc
 * comment for the full backend trace and confirmed gap. Old frontend
 * gates this to the `operator` global role only (plus admins) — not
 * `sales_manager`, unlike `/operators` — since it's a personal "my
 * feedback" view, not a management screen (see
 * `features/operators/permissions.ts`). */
export default function OperatorFeedbacksPage() {
  const roles = useSessionStore((s) => s.roles);

  if (!canViewOperatorFeedbacksPage(roles)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="You don't have access to this page"
          description="This page is only available to accounts with the operator role."
        />
      </div>
    );
  }

  return <OperatorFeedbacksPageContent />;
}
