import { dbProxyQuery, dbProxyQueryWithCount } from "@/services/api/db-proxy";
import type { NotificationRow } from "@/services/realtime/subscriptions";

/**
 * Notifications bell (Phase 2m). `notifications` has no dedicated REST
 * controller — confirmed by grepping `dev.operatora/app/backend/src` for
 * `*notification*controller*` (only `notification-rules`, `push-notifications`,
 * and the admin-only `admin-notifications.controller.ts` "send" endpoint
 * exist; nothing reads a user's own rows). It's registered `{ table:
 * 'notifications', scope: 'user' }` in `table-registry.ts`, same as
 * `PROGRESS.md`'s Phase 2k writeup — so this goes through the sanctioned
 * `db-proxy` compat seam, scoped server-side to the caller's own rows via
 * the JWT (never sent as a client param). Row shape mirrors the Prisma
 * `notifications` model exactly (`id, user_id, type, title, content,
 * is_read, related_id, image_url, created_at`); `NotificationRow` is
 * imported from `services/realtime/subscriptions.ts` (Phase 2k) rather than
 * redeclared here, since that's the type the socket handler already
 * produces from the same table.
 */
const TABLE = "notifications";
const LIST_LIMIT = 30;

export interface NotificationsPage {
  items: NotificationRow[];
  unreadCount: number;
}

export const notificationsApi = {
  /** Most recent notifications for the bell dropdown, plus a true unread
   * count (via `count: 'exact'`, independent of `LIST_LIMIT`) for the badge
   * — one round-trip pair, not a page-by-page approximation. */
  async list(): Promise<NotificationsPage> {
    const [items, unread] = await Promise.all([
      dbProxyQuery<NotificationRow[]>(TABLE, {
        method: "select",
        select: "id, type, title, content, related_id, sender_id, is_read, image_url, created_at",
        order: [{ column: "created_at", ascending: false }],
        limit: LIST_LIMIT,
      }),
      dbProxyQueryWithCount<NotificationRow[]>(TABLE, {
        method: "select",
        select: "id",
        filters: [{ column: "is_read", op: "eq", value: false }],
        count: "exact",
        limit: 1,
      }),
    ]);
    return { items: items ?? [], unreadCount: unread.count ?? 0 };
  },

  /** Marks one notification read. Idempotent (setting `is_read: true` on an
   * already-read row is a no-op), so safe to fire without extra dedup. */
  async markRead(id: string): Promise<void> {
    await dbProxyQuery(TABLE, {
      method: "update",
      values: { is_read: true },
      filters: [{ column: "id", op: "eq", value: id }],
    });
  },

  /** Marks every one of the caller's unread notifications read. */
  async markAllRead(): Promise<void> {
    await dbProxyQuery(TABLE, {
      method: "update",
      values: { is_read: true },
      filters: [{ column: "is_read", op: "eq", value: false }],
    });
  },
};
