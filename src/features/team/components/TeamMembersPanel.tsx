"use client";

import { useState } from "react";
import { Avatar, Button, Input, ListBox, Select, useOverlayState } from "@heroui/react";
import { Handset, Plus, Magnifier as Search } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { useDebounce } from "@/hooks/useDebounce";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { useTeamMembersQuery } from "@/features/team/hooks/useTeamMembersQuery";
import { useRemoveMemberMutation } from "@/features/team/hooks/useTeamMemberMutations";
import { useMyWorkspacePermissionsQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import { useBillingFeaturesQuery } from "@/features/team/hooks/useBilling";
import { useWorkspacePresence } from "@/features/team/hooks/useWorkspacePresence";
import { useOperatorActivitySummary } from "@/features/team/hooks/useOperatorActivitySummary";
import { canAddOperators } from "@/features/team/operatorSeats";
import { memberDisplayStatus, VIEW_PRESENCE_ROLES, type TeamMemberRow } from "@/features/team/types";
import { InviteMemberModal } from "@/features/team/components/InviteMemberModal";
import { EditMemberModal, type EditMemberTab } from "@/features/team/components/EditMemberModal";
import { MemberStatusChip } from "@/features/team/components/MemberStatusChip";
import { MemberRowMenu } from "@/features/team/components/MemberRowMenu";
import { MobileMemberCard } from "@/features/team/components/MobileMemberCard";
import { DeleteMemberConfirm } from "@/features/team/components/DeleteMemberConfirm";
import { TeamSeatsPanel, UpgradeToProBanner } from "@/features/team/components/TeamSeatsPanel";

const STATUS_FILTER_OPTIONS = [
  { id: "all", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Deactivated" },
];

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

function formatLastActive(lastLoginAt: string | null, live?: { online: boolean; last_seen: string | null }): string {
  if (live?.online) return "Online now";
  const ts = live?.last_seen ?? lastLoginAt;
  if (!ts) return "Never";
  const diffMs = Date.now() - new Date(ts).getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

function formatHoursMinutes(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Team Members — `GET/POST/PATCH/DELETE /admin-users/operators` plus, this
 * pass, everything the gap analysis against the old frontend's
 * `OperatorUsersManager.tsx` found real backend contracts for: per-operator
 * SIP/GSM/SMS devices (tabbed edit dialog), seats/billing, presence and
 * activity (both gated to `VIEW_PRESENCE_ROLES`), and a type-to-confirm
 * remove flow. Legacy permission checkboxes are explicitly out of scope —
 * see PROGRESS.md.
 */
export function TeamMembersPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const debouncedSearch = useDebounce(search, 300);

  const membersQuery = useTeamMembersQuery(workspaceId, {
    q: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const billingQuery = useBillingFeaturesQuery(workspaceId);
  const myPermissionsQuery = useMyWorkspacePermissionsQuery(workspaceId);
  const canViewPresence = VIEW_PRESENCE_ROLES.has(myPermissionsQuery.data?.workspace_role ?? "");
  const presence = useWorkspacePresence(workspaceId, canViewPresence);
  const activityQuery = useOperatorActivitySummary(workspaceId, canViewPresence);
  const removeMember = useRemoveMemberMutation(workspaceId);

  const inviteState = useOverlayState();
  const editState = useOverlayState();
  const [editingMember, setEditingMember] = useState<TeamMemberRow | null>(null);
  const [editingTab, setEditingTab] = useState<EditMemberTab>("profile");
  const [removeTarget, setRemoveTarget] = useState<TeamMemberRow | null>(null);

  function openEdit(member: TeamMemberRow, tab: EditMemberTab) {
    setEditingMember(member);
    setEditingTab(tab);
    editState.open();
  }

  const shellProps = {
    title: "Team Members",
    subtitle: "Invite teammates, assign roles, and manage access to this workspace.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  const members = membersQuery.data ?? [];
  const canInvite = canAddOperators(billingQuery.data);

  return (
    <>
      <SettingsSectionShell
        {...shellProps}
        wide
        actions={
          canInvite ? (
            <Button variant="primary" onPress={() => inviteState.open()}>
              <Plus className="size-4" aria-hidden="true" />
              Invite teammate
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-4 pb-4">
          {!billingQuery.isLoading && !canInvite ? <UpgradeToProBanner /> : null}

          {canInvite ? (
            <TeamSeatsPanel
              workspaceId={workspaceId}
              members={members}
              billing={billingQuery.data}
              ownerMember={members.find((m) => m.is_owner) ?? null}
              // Old frontend opened the same invite dialog for both seat
              // types, only varying a cosmetic "Included"/"Premium" badge
              // inside it (no different request body/endpoint) — the
              // dialog itself carries no seat-type field to preserve, so
              // both slots simply open the one real invite flow.
              onInviteIncluded={() => inviteState.open()}
              onInvitePremium={() => inviteState.open()}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/40"
                aria-hidden="true"
              />
              <Input
                aria-label="Search members"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(key) => {
                if (typeof key === "string") setStatusFilter(key as typeof statusFilter);
              }}
              className="w-44"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={STATUS_FILTER_OPTIONS}>
                  {(opt) => (
                    <ListBox.Item id={opt.id} textValue={opt.label}>
                      {opt.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>

        {membersQuery.isLoading ? (
          <LoadingState label="Loading team members…" className="py-16" />
        ) : membersQuery.isError ? (
          <ErrorState error={membersQuery.error} onRetry={() => membersQuery.refetch()} className="py-16" />
        ) : members.length === 0 ? (
          <EmptyState
            title={debouncedSearch || statusFilter !== "all" ? "No members match your filters" : "No team members yet"}
            description={
              debouncedSearch || statusFilter !== "all"
                ? "Try a different search term or status filter."
                : "Invite your first teammate to start collaborating in this workspace."
            }
            className="py-16"
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
            {/* Desktop/tablet: full table. Below md, a stacked card list takes
                over — a genuinely separate responsive view, not just a CSS
                reflow, matching the old frontend's approach. */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-black/[0.08] bg-black/[0.02] text-left text-xs font-medium text-foreground/50 dark:border-white/[0.12] dark:bg-white/[0.03]">
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">SIP</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">{canViewPresence ? "Live status" : "Last active"}</th>
                  {canViewPresence ? <th className="px-4 py-2.5 font-medium">Active today</th> : null}
                  <th className="w-12 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const live = presence[member.user_id];
                  const stats = activityQuery.data?.[member.user_id];
                  const hasStats = stats && (stats.active_seconds >= 60 || stats.idle_seconds >= 60);
                  return (
                    <tr
                      key={member.user_id}
                      className="border-b border-black/[0.06] last:border-b-0 hover:bg-black/[0.02] dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(member, "profile")}
                          className="flex w-full items-center gap-3 text-left hover:opacity-80"
                        >
                          <span className="relative shrink-0">
                            <Avatar size="sm">
                              {member.avatar_url ? <Avatar.Image src={member.avatar_url} alt="" /> : null}
                              <Avatar.Fallback>{initials(member.full_name, member.email)}</Avatar.Fallback>
                            </Avatar>
                            {canViewPresence && live?.online ? (
                              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-success" />
                            ) : null}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {member.full_name || member.email || "Unnamed"}
                              {member.is_owner ? <span className="ml-2 text-xs font-normal text-foreground/40">Owner</span> : null}
                            </p>
                            <p className="truncate text-xs text-foreground/50">{member.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-foreground/70">{member.rbac_roles.length > 0 ? member.rbac_roles.join(", ") : "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(member, "sip")}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <Handset className="size-3.5" aria-hidden="true" />
                          {member.sip_count > 0 ? `${member.sip_count} SIP` : "Configure"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <MemberStatusChip status={memberDisplayStatus(member)} />
                      </td>
                      <td className="px-4 py-3 text-foreground/70">
                        <span className={canViewPresence && live?.online ? "font-medium text-success" : undefined}>
                          {formatLastActive(member.last_login_at, live)}
                        </span>
                      </td>
                      {canViewPresence ? (
                        <td className="px-4 py-3">
                          {hasStats && stats ? (
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-medium text-success">Active {formatHoursMinutes(stats.active_seconds)}</span>
                              <span className="text-foreground/50">Idle {formatHoursMinutes(stats.idle_seconds)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-foreground/40">No activity today</span>
                          )}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <MemberRowMenu member={member} onEdit={openEdit} onRemove={setRemoveTarget} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] md:hidden">
              {members.map((member) => (
                <MobileMemberCard
                  key={member.user_id}
                  member={member}
                  presence={presence}
                  canViewPresence={canViewPresence}
                  onOpenProfile={() => openEdit(member, "profile")}
                  onOpenSip={() => openEdit(member, "sip")}
                  onEdit={openEdit}
                  onRemove={setRemoveTarget}
                />
              ))}
            </div>
          </div>
        )}
      </SettingsSectionShell>

      <InviteMemberModal workspaceId={workspaceId} state={inviteState} />
      <EditMemberModal workspaceId={workspaceId} member={editingMember} state={editState} initialTab={editingTab} />

      <DeleteMemberConfirm
        isOpen={!!removeTarget}
        memberName={removeTarget?.full_name || removeTarget?.email || "this member"}
        memberEmail={removeTarget?.email ?? "REMOVE"}
        loading={removeMember.isPending}
        onConfirm={() => {
          if (!removeTarget) return;
          removeMember.mutate(removeTarget.user_id, { onSuccess: () => setRemoveTarget(null) });
        }}
        onClose={() => setRemoveTarget(null)}
      />
    </>
  );
}
