"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationsApi } from "@/services/api/notifications";
import { userNotificationsQueryKey } from "@/services/realtime/subscriptions";
import type { NotificationRow } from "@/services/realtime/subscriptions";
import { useSessionStore } from "@/state/session-store";

/**
 * Backs the notifications bell (Phase 2m). Deliberately keyed off the exact
 * same `userNotificationsQueryKey(userId)` that `subscribeToUserNotifications`
 * (Phase 2k, `services/realtime/subscriptions.ts`) already debounce-
 * invalidates on every `notifications` INSERT for this user — so realtime
 * updates land here with zero extra wiring, per the feature brief.
 */
export function useNotificationsQuery() {
  const userId = useSessionStore((s) => s.user?.id ?? null);

  return useQuery({
    queryKey: userId ? userNotificationsQueryKey(userId) : ["user-notifications-disabled"],
    queryFn: () => notificationsApi.list(),
    enabled: Boolean(userId),
    staleTime: 15_000,
  });
}

/** Marks a single notification read with an optimistic patch (safe —
 * `is_read: true` is idempotent, and the badge/row state visibly settling
 * instantly is worth it for a low-risk toggle like this). Rolls back on
 * failure rather than faking success while offline/erroring. */
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const queryKey = userId ? userNotificationsQueryKey(userId) : ["user-notifications-disabled"];

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ items: NotificationRow[]; unreadCount: number }>(queryKey);
      if (previous) {
        const wasUnread = previous.items.some((n) => n.id === id && !n.is_read);
        queryClient.setQueryData(queryKey, {
          items: previous.items.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
          unreadCount: wasUnread ? Math.max(0, previous.unreadCount - 1) : previous.unreadCount,
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const queryKey = userId ? userNotificationsQueryKey(userId) : ["user-notifications-disabled"];

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ items: NotificationRow[]; unreadCount: number }>(queryKey);
      if (previous) {
        queryClient.setQueryData(queryKey, {
          items: previous.items.map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
