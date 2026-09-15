"use client";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { canViewInstructionsPage } from "@/features/instructions/permissions";
import { InstructionsPageContent } from "@/features/instructions/components/InstructionsPageContent";

/** `/instructions` — see `InstructionsPageContent`'s doc comment for the
 * full backend trace. Page-level access is a client-side courtesy
 * mirroring the old frontend's `canViewPage("instructions")` allowlist
 * (see `features/instructions/permissions.ts`) — the backend doesn't gate
 * reads by role at all here, only writes (`writeRoles: MANAGER_ROLES` on
 * both `instructions` and `quick_links`). */
export default function InstructionsPage() {
  const roles = useSessionStore((s) => s.roles);

  if (!canViewInstructionsPage(roles)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="You don't have access to Instructions"
          description="Ask a workspace admin to grant you access to this page."
        />
      </div>
    );
  }

  return <InstructionsPageContent />;
}
