import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type { AdminConversationRow, AdminConversationsFilters, AdminConversationsStats } from "@/features/admin/types";

/** `/admin/conversations*` — confirmed against `admin-conversations.controller.ts`. */
export const adminConversationsApi = {
  list(filters: AdminConversationsFilters): Promise<{ rows: AdminConversationRow[]; total: number; page: number; perPage: number }> {
    return apiFetch(`/admin/conversations${buildAdminQuery(filters)}`);
  },
  stats(filters: AdminConversationsFilters): Promise<AdminConversationsStats> {
    return apiFetch<AdminConversationsStats>(`/admin/conversations/stats${buildAdminQuery(filters)}`);
  },
};
