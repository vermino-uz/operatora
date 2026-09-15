import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type { AiFeedbackFilters, AiFeedbackListResponse, AiFeedbackRow, ReviewAiFeedbackPatch } from "@/features/admin/types";

/**
 * `/admin/ai-feedback/*` — real, confirmed against `admin-ai-feedback.controller.ts`.
 * Same "not in the original brief, but live" case as Analytics — ported.
 */
export const adminAiFeedbackApi = {
  list(filters: AiFeedbackFilters): Promise<AiFeedbackListResponse> {
    return apiFetch<AiFeedbackListResponse>(`/admin/ai-feedback${buildAdminQuery(filters)}`);
  },
  review(id: string, patch: ReviewAiFeedbackPatch): Promise<AiFeedbackRow> {
    return apiFetch<AiFeedbackRow>(`/admin/ai-feedback/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: {
        admin_label: patch.adminLabel,
        admin_notes: patch.adminNotes,
        review_status: patch.reviewStatus,
        dataset_eligible: patch.datasetEligible,
      },
    });
  },
};
