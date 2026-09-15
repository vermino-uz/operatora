"use client";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { canViewSocialMediaAdvisorPage } from "@/features/social-media-advisor/permissions";
import { SocialMediaAdvisorPageContent } from "@/features/social-media-advisor/components/SocialMediaAdvisorPageContent";

/** `/social-media-advisor` — see `SocialMediaAdvisorPageContent`'s doc
 * comment for the full backend trace. Page-level access mirrors the old
 * frontend's `canViewPage("social-media-advisor")`, which — unlike
 * `/instructions` — is only reachable via the global-admin early-return
 * (see `features/social-media-advisor/permissions.ts`); sales_manager,
 * operator, and finance_manager are all excluded, not just finance_manager. */
export default function SocialMediaAdvisorPage() {
  const roles = useSessionStore((s) => s.roles);

  if (!canViewSocialMediaAdvisorPage(roles)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="You don't have access to Social Media Advisor"
          description="Ask a workspace admin to grant you access to this page."
        />
      </div>
    );
  }

  return <SocialMediaAdvisorPageContent />;
}
