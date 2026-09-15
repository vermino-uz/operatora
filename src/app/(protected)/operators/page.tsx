"use client";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { canViewOperatorsPage } from "@/features/operators/permissions";
import { OperatorsPageContent } from "@/features/operators/components/OperatorsPageContent";

/** `/operators` — see `OperatorsPageContent`'s doc comment for the full
 * backend trace. Page-level access is a client-side courtesy mirroring
 * the old frontend's `canViewPage("operators")` allowlist (see
 * `features/operators/permissions.ts`) — the backend itself doesn't gate
 * the read endpoints by role, only the feedback write endpoints (admin/
 * sales_manager), which is where the real authorization boundary is. */
export default function OperatorsPage() {
  const roles = useSessionStore((s) => s.roles);

  if (!canViewOperatorsPage(roles)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="You don't have access to Operators"
          description="Ask a workspace admin or sales manager to grant you access to this page."
        />
      </div>
    );
  }

  return <OperatorsPageContent />;
}
