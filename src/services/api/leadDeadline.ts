import { apiFetch } from "@/services/api/client";
import type { LeadRow } from "@/features/leads/types";

/**
 * `PATCH /deadline/:leadId` (`leads-controller/deadline/deadline.controller.ts`/
 * `.service.ts`) — the dedicated endpoint for setting/clearing a lead's
 * `deadline` field. Used by `RequireFieldDialog` (Phase 2c-5) to resolve a
 * `FIELD_REQUIRED:deadline` gate failure without going through the generic
 * `PATCH /leads/:id` — this one is simpler (single field, no diffing) and is
 * the endpoint the old frontend's own "Deadline belgilash" UI calls.
 * `deadline: null` (or an empty string) clears it — confirmed directly in
 * `DeadlineService.updateDeadline()`.
 */
export const deadlineApi = {
  async update(leadId: string, deadline: string | null): Promise<LeadRow> {
    return apiFetch<LeadRow>(`/deadline/${encodeURIComponent(leadId)}`, {
      method: "PATCH",
      body: { deadline },
    });
  },
};
