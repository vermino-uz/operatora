"use client";

import { Dropdown, Separator } from "@heroui/react";
import {
  ArrowDownToLine as Download,
  Link as LinkIcon,
  Person,
  Sparkles,
  TrashBin,
} from "@gravity-ui/icons";

import {
  ConversationListItemContent,
  conversationListItemClassName,
  type ConversationListItemProps,
} from "@/features/messages/components/ConversationListItem";
import type { TelegramChatAssignee } from "@/services/api/telegramMessages";
import type { TelegramChat } from "@/features/messages/types";

export interface TelegramChatListMenuProps extends Omit<ConversationListItemProps, "onSelect"> {
  chat: TelegramChat;
  currentUserId?: string | null;
  assignees: TelegramChatAssignee[];
  assigneesLoading?: boolean;
  agenticEnabled?: boolean;
  showTakeOver?: boolean;
  showResume?: boolean;
  onSelect: (id: string) => void;
  onAssignToMe: () => void;
  onUnassign: () => void;
  onAssignTo: (userId: string) => void;
  onLinkLead: () => void;
  onExport: () => void;
  onTakeOver?: () => void;
  onResume?: () => void;
  onDelete: () => void;
  onOpenChange?: (open: boolean) => void;
}

/** Right-click context menu for a Telegram chat list row — mirrors the old
 * frontend's `TelegramChannelPanel` chat `ContextMenu`. The row itself is
 * the dropdown trigger (single button) so we never nest buttons. */
export function TelegramChatListMenu({
  chat: _chat,
  id,
  currentUserId,
  assignees,
  assigneesLoading,
  agenticEnabled,
  showTakeOver,
  showResume,
  onSelect,
  onAssignToMe,
  onUnassign,
  onAssignTo,
  onLinkLead,
  onExport,
  onTakeOver,
  onResume,
  onDelete,
  onOpenChange,
  active,
  attention,
  ...itemProps
}: TelegramChatListMenuProps) {
  const otherAssignees = assignees.filter((a) => a.user_id && a.user_id !== currentUserId);

  return (
    <li>
      <Dropdown trigger="contextMenu" onOpenChange={onOpenChange}>
        <Dropdown.Trigger
          className={conversationListItemClassName(active, attention)}
          onPress={() => onSelect(id)}
        >
          <ConversationListItemContent attention={attention} {...itemProps} />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start">
          <Dropdown.Menu aria-label="Chat actions" className="min-w-[220px]">
            <Dropdown.Item id="assign-me" onAction={onAssignToMe} isDisabled={!currentUserId}>
              <Person className="size-3.5" aria-hidden="true" />
              Assign to me
            </Dropdown.Item>
            <Dropdown.Item id="unassign" onAction={onUnassign}>
              Unassign
            </Dropdown.Item>
            <Dropdown.SubmenuTrigger>
              <Dropdown.Item id="assign-to">Assign to…</Dropdown.Item>
              <Dropdown.Popover placement="right top">
                <Dropdown.Menu aria-label="Assign to teammate" className="max-h-[320px] min-w-[200px] overflow-y-auto">
                  {assigneesLoading ? (
                    <Dropdown.Item id="loading" isDisabled>
                      Loading…
                    </Dropdown.Item>
                  ) : otherAssignees.length === 0 ? (
                    <Dropdown.Item id="empty" isDisabled>
                      No teammates
                    </Dropdown.Item>
                  ) : (
                    otherAssignees.map((opt) => (
                      <Dropdown.Item key={opt.user_id} id={`assign-${opt.user_id}`} onAction={() => onAssignTo(opt.user_id)}>
                        {opt.label}
                      </Dropdown.Item>
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
            <Dropdown.Item id="link-lead" onAction={onLinkLead}>
              <LinkIcon className="size-3.5" aria-hidden="true" />
              Link to lead
            </Dropdown.Item>
            <Dropdown.Item id="export" onAction={onExport}>
              <Download className="size-3.5" aria-hidden="true" />
              Export chat
            </Dropdown.Item>
            {agenticEnabled && showTakeOver && onTakeOver ? (
              <Dropdown.Item id="takeover" onAction={onTakeOver}>
                <Sparkles className="size-3.5" aria-hidden="true" />
                Take over from agent
              </Dropdown.Item>
            ) : null}
            {agenticEnabled && showResume && onResume ? (
              <Dropdown.Item id="resume" onAction={onResume}>
                <Sparkles className="size-3.5" aria-hidden="true" />
                Resume agent
              </Dropdown.Item>
            ) : null}
            <Separator />
            <Dropdown.Item id="delete" onAction={onDelete} className="text-danger">
              <TrashBin className="size-3.5" aria-hidden="true" />
              Delete chat
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </li>
  );
}
