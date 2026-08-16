"use client";

import { Avatar } from "@heroui/react";
import { Handset } from "@gravity-ui/icons";

import { memberDisplayStatus, type TeamMemberRow, type WorkspacePresenceMap } from "@/features/team/types";
import { MemberStatusChip } from "@/features/team/components/MemberStatusChip";
import { MemberRowMenu } from "@/features/team/components/MemberRowMenu";
import type { EditMemberTab } from "@/features/team/components/EditMemberModal";

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

/** Mobile-specific stacked card layout — a separate responsive view from
 * the desktop table (not just a CSS reflow), matching the old frontend's
 * `md:hidden` card list in `OperatorUsersManager`. */
export function MobileMemberCard({
  member,
  presence,
  canViewPresence,
  onOpenProfile,
  onOpenSip,
  onEdit,
  onRemove,
}: {
  member: TeamMemberRow;
  presence: WorkspacePresenceMap;
  canViewPresence: boolean;
  onOpenProfile: () => void;
  onOpenSip: () => void;
  onEdit: (member: TeamMemberRow, tab: EditMemberTab) => void;
  onRemove: (member: TeamMemberRow) => void;
}) {
  const live = presence[member.user_id];
  const online = canViewPresence && !!live?.online;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpenProfile} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="relative shrink-0">
            <Avatar size="sm">
              {member.avatar_url ? <Avatar.Image src={member.avatar_url} alt="" /> : null}
              <Avatar.Fallback>{initials(member.full_name, member.email)}</Avatar.Fallback>
            </Avatar>
            {online ? (
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-success" />
            ) : null}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {member.full_name || member.email || "Unnamed"}
              {member.is_owner ? <span className="ml-2 text-xs font-normal text-foreground/40">Owner</span> : null}
            </p>
            <p className="truncate text-xs text-foreground/50">{member.email}</p>
          </div>
        </button>
        <MemberRowMenu member={member} onEdit={onEdit} onRemove={onRemove} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-foreground/60">{member.rbac_roles.join(", ") || "No role"}</span>
        <MemberStatusChip status={memberDisplayStatus(member)} />
      </div>
      <div className="flex items-center justify-between text-xs text-foreground/50">
        <button type="button" onClick={onOpenSip} className="inline-flex items-center gap-1.5 font-medium text-primary">
          <Handset className="size-3.5" aria-hidden="true" />
          {member.sip_count > 0 ? `${member.sip_count} SIP account${member.sip_count === 1 ? "" : "s"}` : "Configure"}
        </button>
        {canViewPresence ? (
          <span className={online ? "font-medium text-success" : undefined}>
            {online ? "Online now" : live?.last_seen ? new Date(live.last_seen).toLocaleString() : "—"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
