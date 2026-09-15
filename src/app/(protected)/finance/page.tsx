"use client";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { canViewFinancePage } from "@/features/finance/permissions";
import { FinancePageContent } from "@/features/finance/components/FinancePageContent";

/** `/finance` — standalone workspace tuition/course-payment back-office,
 * distinct from the `billing` settings section (Operatora's own
 * subscription self-service). See `FinancePageContent`'s doc comment and
 * `features/finance/types.ts` for the full backend trace. Page-level
 * access is a client-side courtesy mirroring the old frontend's
 * `canViewPage("finance")` allowlist — narrower than every other gated
 * page in this app (admin-tier roles + `finance_manager` only; not even
 * `sales_manager`). */
export default function FinancePage() {
  const roles = useSessionStore((s) => s.roles);

  if (!canViewFinancePage(roles)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="You don't have access to Finance"
          description="Ask a workspace admin to grant you access to this page."
        />
      </div>
    );
  }

  return <FinancePageContent />;
}
