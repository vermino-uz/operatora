"use client";

import { useState } from "react";
import { Button, Popover } from "@heroui/react";
import { Check, ChevronDown, Funnel } from "@gravity-ui/icons";

import type { InboxFilter } from "@/features/messages/lib/inboxFilters";
import type { TelegramChatAssignee } from "@/services/api/telegramMessages";

export interface InboxFilterPopoverProps {
  value: InboxFilter;
  onChange: (next: InboxFilter) => void;
  unreadCount?: number;
  mineCount?: number;
  operatorId?: string | null;
  onOperatorChange?: (userId: string | null) => void;
  operators?: TelegramChatAssignee[];
  operatorsLoading?: boolean;
}

const STATUS_ITEMS: { key: InboxFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mine", label: "Mine" },
  { key: "unassigned", label: "Unassigned" },
];

export function InboxFilterPopover({
  value,
  onChange,
  unreadCount = 0,
  mineCount = 0,
  operatorId = null,
  onOperatorChange,
  operators = [],
  operatorsLoading,
}: InboxFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const operatorLabel = operatorId ? operators.find((o) => o.user_id === operatorId)?.label : null;
  const isActive = value !== "all" || operatorId != null;
  const buttonLabel =
    operatorLabel ?? (value === "all" ? "Filter" : STATUS_ITEMS.find((i) => i.key === value)?.label ?? "Filter");

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button
          size="sm"
          variant={isActive ? "secondary" : "ghost"}
          className={`h-7 shrink-0 gap-1 px-2.5 text-[11px] font-semibold ${isActive ? "text-[#3A9BDC]" : ""}`}
        >
          <Funnel className="size-3.5" aria-hidden="true" />
          {buttonLabel}
          {value === "unread" && unreadCount > 0 ? (
            <span className="rounded-md bg-[#3A9BDC] px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>
          ) : null}
          <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
        </Button>
      </Popover.Trigger>
      <Popover.Content className="w-56 p-2">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">Status</p>
        {STATUS_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onChange(item.key);
              onOperatorChange?.(null);
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[13px] hover:bg-[var(--default)]"
          >
            <span>{item.label}</span>
            <span className="flex items-center gap-2 text-[11px] text-foreground/40">
              {item.key === "unread" && unreadCount > 0 ? unreadCount : null}
              {item.key === "mine" && mineCount > 0 ? mineCount : null}
              {value === item.key && !operatorId ? <Check className="size-3.5 text-[#3A9BDC]" aria-hidden="true" /> : null}
            </span>
          </button>
        ))}
        {onOperatorChange ? (
          <>
            <p className="mt-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">Operator</p>
            {operatorsLoading ? (
              <p className="px-2 py-2 text-xs text-foreground/45">Loading…</p>
            ) : operators.length === 0 ? (
              <p className="px-2 py-2 text-xs text-foreground/45">No teammates</p>
            ) : (
              operators.map((opt) => (
                <button
                  key={opt.user_id}
                  type="button"
                  onClick={() => {
                    onOperatorChange(opt.user_id);
                    onChange("all");
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[13px] hover:bg-[var(--default)]"
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="flex shrink-0 items-center gap-2 text-[11px] text-foreground/40">
                    {opt.chat_count ?? 0}
                    {operatorId === opt.user_id ? <Check className="size-3.5 text-[#3A9BDC]" aria-hidden="true" /> : null}
                  </span>
                </button>
              ))
            )}
          </>
        ) : null}
      </Popover.Content>
    </Popover>
  );
}
