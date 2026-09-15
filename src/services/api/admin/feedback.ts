import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type { FeedbackFilters, FeedbackListResponse, FeedbackRow } from "@/features/admin/types";

/** `/admin/feedback/*` — confirmed against `admin-feedback.controller.ts`. */
export const adminFeedbackApi = {
  list(filters: FeedbackFilters): Promise<FeedbackListResponse> {
    return apiFetch<FeedbackListResponse>(`/admin/feedback${buildAdminQuery(filters)}`);
  },
  updateStatus(id: string, status: string, adminNotes?: string): Promise<FeedbackRow> {
    return apiFetch<FeedbackRow>(`/admin/feedback/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status, adminNotes },
    });
  },
  updateNotes(id: string, notes: string): Promise<FeedbackRow> {
    return apiFetch<FeedbackRow>(`/admin/feedback/${encodeURIComponent(id)}/notes`, {
      method: "PATCH",
      body: { notes },
    });
  },
  remove(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/admin/feedback/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
