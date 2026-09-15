"use client";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { canViewFormsPage } from "@/features/forms/permissions";
import { FormsPageContent } from "@/features/forms/components/FormsPageContent";

/** `/forms` — the form BUILDER, distinct from the public `/form/[formId]`
 * submission view (Phase 2e). See `FormsPageContent`'s doc comment for the
 * full backend trace. Page-level access is a client-side courtesy mirroring
 * the old frontend's `canViewPage("forms")` allowlist. */
export default function FormsPage() {
  const roles = useSessionStore((s) => s.roles);

  if (!canViewFormsPage(roles)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="You don't have access to Forms"
          description="Ask a workspace admin to grant you access to this page."
        />
      </div>
    );
  }

  return <FormsPageContent />;
}
