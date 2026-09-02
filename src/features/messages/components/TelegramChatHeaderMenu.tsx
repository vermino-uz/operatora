"use client";

import { Dropdown, Separator } from "@heroui/react";
import {
  Ban,
  Check,
  EllipsisVertical,
  Link as LinkIcon,
  PersonPlus,
  SquareXmark,
} from "@gravity-ui/icons";

export interface TelegramChatHeaderMenuProps {
  linkedLeadId?: string | null;
  excludedFromAgent?: boolean;
  closed?: boolean;
  agenticEnabled?: boolean;
  busy?: boolean;
  onLinkLead: () => void;
  onCreateLead: () => void;
  onUnlinkLead?: () => void;
  onSetExcluded?: (excluded: boolean) => void;
  onSetClosed?: (closed: boolean) => void;
}

export function TelegramChatHeaderMenu({
  linkedLeadId,
  excludedFromAgent,
  closed,
  agenticEnabled,
  busy,
  onLinkLead,
  onCreateLead,
  onUnlinkLead,
  onSetExcluded,
  onSetClosed,
}: TelegramChatHeaderMenuProps) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="Chat options"
        className="inline-flex size-9 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-[var(--default)] hover:text-foreground"
      >
        <EllipsisVertical className="size-4" aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label="Chat options" className="min-w-[200px]">
          <Dropdown.Item id="link-lead" onAction={onLinkLead}>
            <LinkIcon className="size-3.5" aria-hidden="true" />
            {linkedLeadId ? "Change linked lead" : "Link to lead"}
          </Dropdown.Item>
          <Dropdown.Item id="create-lead" onAction={onCreateLead}>
            <PersonPlus className="size-3.5" aria-hidden="true" />
            Create lead
          </Dropdown.Item>
          {linkedLeadId && onUnlinkLead ? (
            <Dropdown.Item id="unlink-lead" onAction={onUnlinkLead}>
              <LinkIcon className="size-3.5" aria-hidden="true" />
              Unlink lead
            </Dropdown.Item>
          ) : null}
          {agenticEnabled && onSetExcluded ? (
            <>
              <Separator />
              <Dropdown.Item id="exclude-ai" onAction={() => onSetExcluded(!excludedFromAgent)} isDisabled={busy}>
                <Ban className="size-3.5" aria-hidden="true" />
                {excludedFromAgent ? "Include in AI agent" : "Exclude from AI agent"}
              </Dropdown.Item>
            </>
          ) : null}
          {onSetClosed ? (
            <>
              <Separator />
              <Dropdown.Item id="close-chat" onAction={() => onSetClosed(!closed)} isDisabled={busy}>
                {closed ? <Check className="size-3.5" aria-hidden="true" /> : <SquareXmark className="size-3.5" aria-hidden="true" />}
                {closed ? "Reopen conversation" : "Close conversation"}
              </Dropdown.Item>
            </>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
