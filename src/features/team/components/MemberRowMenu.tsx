"use client";

import { Button, Dropdown } from "@heroui/react";
import { EllipsisVertical, Handset, Pencil, ShieldCheck, TrashBin } from "@gravity-ui/icons";

import type { TeamMemberRow } from "@/features/team/types";
import type { EditMemberTab } from "@/features/team/components/EditMemberModal";

/** Row actions menu — Edit / Role / SIP & devices (tab-targeted deep links
 * into the tabbed edit dialog) / Remove, ported from the old frontend's
 * `OperatorRowMenu`. Remove is hidden for the workspace owner (self is
 * filtered by the caller, matching old behavior). */
export function MemberRowMenu({
  member,
  onEdit,
  onRemove,
}: {
  member: TeamMemberRow;
  onEdit: (member: TeamMemberRow, tab: EditMemberTab) => void;
  onRemove: (member: TeamMemberRow) => void;
}) {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button variant="secondary" size="sm" isIconOnly aria-label="Member actions">
          <EllipsisVertical className="size-4" aria-hidden="true" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label="Member actions" className="min-w-[180px]">
          <Dropdown.Item id="edit" onAction={() => onEdit(member, "profile")}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit member
          </Dropdown.Item>
          <Dropdown.Item id="role" onAction={() => onEdit(member, "role")}>
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Role
          </Dropdown.Item>
          <Dropdown.Item id="sip" onAction={() => onEdit(member, "sip")}>
            <Handset className="size-3.5" aria-hidden="true" />
            SIP &amp; devices
          </Dropdown.Item>
          {!member.is_owner ? (
            <Dropdown.Item id="remove" onAction={() => onRemove(member)} className="text-danger">
              <TrashBin className="size-3.5" aria-hidden="true" />
              Remove
            </Dropdown.Item>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
