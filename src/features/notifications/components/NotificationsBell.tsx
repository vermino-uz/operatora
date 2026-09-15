"use client";

import Link from "next/link";
import { Bell } from "@gravity-ui/icons";
import { Button, Popover } from "@heroui/react";

import { ROUTES } from "@/constants/routes";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { NotificationRow } from "@/services/realtime/subscriptions";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/features/notifications/hooks/useNotificationsQuery";

function formatTimestamp(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (date.getTime() > weekAgo) return date.toLocaleDateString(undefined, { weekday: "short" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** No deep-link target is reliable for every notification type (`system`
 * is used for both task assignment/overdue AND generic admin broadcasts
 * with no related entity — see `admin-notifications.controller.ts` — so a
 * `related_id` there can't safely be assumed to be a task id). Only the two
 * types with an unambiguous, always-correct section are linked; everything
 * else just gets marked read. */
function hrefFor(row: NotificationRow): string | null {
  if (row.type === "lead_update") return ROUTES.leads;
  if (row.type === "message") return ROUTES.messages;
  return null;
}

function NotificationItem({ row }: { row: NotificationRow }) {
  const markRead = useMarkNotificationReadMutation();
  const href = row.id ? hrefFor(row) : null;

  const handleClick = () => {
    if (row.id && !row.is_read) markRead.mutate(row.id);
  };

  const body = (
    <div
      className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--default)] ${
        row.is_read ? "" : "bg-[var(--default)]/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium leading-snug">{row.title || "Notification"}</p>
        {row.is_read ? null : (
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#3A9BDC]" aria-hidden="true" />
        )}
      </div>
      {row.content ? <p className="line-clamp-2 text-xs text-foreground/60">{row.content}</p> : null}
      <span className="text-[11px] text-foreground/40">{formatTimestamp(row.created_at)}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={handleClick} className="block">
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="block w-full" disabled={markRead.isPending && !row.is_read}>
      {body}
    </button>
  );
}

export function NotificationsBell({
  expanded,
  className,
}: {
  /** Sidebar's expanded ("peek") vs. collapsed rail state — controls
   * whether the trigger renders a label next to the icon, matching the Doc
   * link/Account button immediately around it in `AppSidebar.tsx`. */
  expanded: boolean;
  className?: string;
}) {
  const query = useNotificationsQuery();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const unreadCount = query.data?.unreadCount ?? 0;

  return (
    <Popover>
      <Popover.Trigger>
        <button type="button" aria-label="Notifications" className={`relative ${className ?? ""}`}>
          <Bell className="size-5 shrink-0" aria-hidden="true" />
          {expanded ? <span className="truncate text-sm font-medium">Notifications</span> : null}
          {unreadCount > 0 ? (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white"
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Content placement="right bottom" offset={12} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-divider px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              isDisabled={markAllRead.isPending}
              onPress={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto p-1.5">
          {query.isLoading ? (
            <LoadingState label="Loading notifications…" className="py-6" />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-6" />
          ) : !query.data || query.data.items.length === 0 ? (
            <EmptyState title="No notifications yet" description="You're all caught up." className="py-8" />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {query.data.items.map((row, i) => (
                <li key={row.id ?? i}>
                  <NotificationItem row={row} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}
