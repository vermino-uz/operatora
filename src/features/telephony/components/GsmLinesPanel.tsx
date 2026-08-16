"use client";

import { Avatar, Chip } from "@heroui/react";
import { CrownDiamond } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { useWorkspaceGsmTelephonyQuery } from "@/features/telephony/hooks/useWorkspaceTelephony";
import { GsmLinesPanel as OperatorGsmLinesPanel } from "@/features/team/components/sip/GsmLinesPanel";

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

/**
 * Workspace-wide "GSM Lines" settings section — traced from the old
 * frontend's `TelephonyGsmLines.tsx`. Same conclusion as SIP
 * Configuration: not a separate contract from Team Members' per-operator
 * GSM tab, just the same `GET/POST/PATCH/DELETE /gsm?user_id=` contract
 * surfaced as a full-workspace roster (`GET
 * /admin-users/workspace-telephony/gsm?workspace_id=`) with each member's
 * lines panel expanded inline. See `features/telephony/types.ts` for the
 * full trace.
 */
export function GsmLinesWorkspacePanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const query = useWorkspaceGsmTelephonyQuery(workspaceId);

  const totalLines = query.data?.reduce((sum, m) => sum + m.gsm_lines.length, 0) ?? 0;

  return (
    <SettingsSectionShell
      title="GSM Lines"
      subtitle="Manage GSM modem lines used for SMS and telephony across the workspace."
      wide
    >
      {!workspaceId ? (
        <EmptyState title="No workspace selected" description="Select a workspace to manage GSM lines." />
      ) : query.isLoading ? (
        <LoadingState label="Loading GSM lines…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState title="No members yet" description="Invite team members under Team Members to configure their GSM lines." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-background dark:border-white/[0.12]">
          <div className="border-b border-black/[0.08] px-5 py-4 dark:border-white/[0.12]">
            <p className="text-sm font-semibold text-foreground">GSM lines</p>
            <p className="mt-0.5 text-xs text-foreground/60">
              {totalLines > 0 ? `${totalLines} line${totalLines === 1 ? "" : "s"} across the workspace` : "No GSM lines configured yet"}
            </p>
          </div>
          <div className="divide-y divide-black/[0.08] dark:divide-white/[0.12]">
            {query.data.map((member) => (
              <div key={member.user_id} className="p-5">
                <div className="mb-4 flex items-center gap-3">
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
                </div>
                <OperatorGsmLinesPanel userId={member.user_id} enabled />
              </div>
            ))}
          </div>
        </div>
      )}
    </SettingsSectionShell>
  );
}
