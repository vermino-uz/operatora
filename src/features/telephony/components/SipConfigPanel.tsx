"use client";

import { Avatar, Chip } from "@heroui/react";
import { CrownDiamond } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { useWorkspaceSipTelephonyQuery } from "@/features/telephony/hooks/useWorkspaceTelephony";
import { SipAccountsPanel } from "@/features/team/components/sip/SipAccountsPanel";

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

/**
 * Workspace-wide "SIP Configuration" settings section — traced from the old
 * frontend's `SipConfiguration.tsx`. NOT a separate contract from Team
 * Members' per-operator SIP tab: this is the same
 * `GET/POST/:id/activate/DELETE /admin-users/operators/:userId/sip*`
 * contract, just surfaced as one roster of every workspace member with
 * their SIP accounts panel expanded inline, so telephony admins don't have
 * to open each member's edit dialog individually. See
 * `features/telephony/types.ts` for the full trace.
 */
export function SipConfigPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const query = useWorkspaceSipTelephonyQuery(workspaceId);

  return (
    <SettingsSectionShell
      title="SIP Configuration"
      subtitle="Manage SIP telephony accounts for every member of this workspace. Exactly one account per member may be active at a time."
      wide
    >
      {!workspaceId ? (
        <EmptyState title="No workspace selected" description="Select a workspace to manage SIP configuration." />
      ) : query.isLoading ? (
        <LoadingState label="Loading SIP accounts…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState title="No members yet" description="Invite team members under Team Members to configure their SIP accounts." />
      ) : (
        <div className="space-y-4">
          {query.data.map((member) => (
            <div key={member.user_id} className="overflow-hidden rounded-2xl border border-black/[0.08] bg-background dark:border-white/[0.12]">
              <div className="flex items-center gap-3 border-b border-black/[0.08] px-5 py-4 dark:border-white/[0.12]">
                <Avatar size="sm">
                  <Avatar.Fallback>{initials(member.full_name, member.email)}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {member.full_name || member.email || "—"}
                    </p>
                    {member.is_owner ? (
                      <Chip size="sm" color="warning" variant="soft">
                        <Chip.Label className="inline-flex items-center gap-1">
                          <CrownDiamond className="size-3" />
                          Owner
                        </Chip.Label>
                      </Chip>
                    ) : null}
                  </div>
                  {member.full_name && member.email ? (
                    <p className="truncate text-xs text-foreground/60">{member.email}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-foreground/60">
                  {member.sip_accounts.length > 0
                    ? `${member.sip_accounts.length} SIP account${member.sip_accounts.length === 1 ? "" : "s"}`
                    : "No SIP accounts"}
                </span>
              </div>
              <div className="p-5">
                <SipAccountsPanel workspaceId={workspaceId} userId={member.user_id} enabled />
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsSectionShell>
  );
}
