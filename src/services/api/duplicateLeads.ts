import { apiFetch } from "@/services/api/client";
import type { LeadRow } from "@/features/leads/types";

/**
 * Duplicate lead detection/merge — `leads-controller/duplicated-leads/
 * duplicated-leads.controller.ts`. Real, dedicated backend module (not
 * something this pass had to invent client-side): the scan, the delete, and
 * — critically — the merge are all server-side operations.
 *
 * `POST /duplicated-leads/merge` is a genuine, atomic-per-request server
 * operation, not a client-orchestrated sequence of calls: one HTTP request
 * relinks the duplicates' `telegram_chats`/`instagram_conversations` and
 * `lead_comments` onto the survivor, merges phone numbers (deduped against
 * what the survivor already has) and `custom_fields` (survivor wins on
 * conflict), keeps `sold: true` if *any* lead in the group was sold, then
 * soft-deletes the merged-away leads — confirmed directly in
 * `duplicated-leads.service.ts`'s `mergeLeads()`, not assumed. This is why
 * this pass calls that one endpoint rather than re-implementing the
 * phones/comments/chats/sold-status absorption with several sequential
 * client calls (which could partially fail and leave things inconsistent).
 */
export interface DuplicateLeadGroup {
  key: string;
  leads: LeadRow[];
  duplicateBy: "Phone Number" | "Full Name" | string;
}

export const duplicateLeadsApi = {
  /** `GET /duplicated-leads?boardId=` — every duplicate cluster on the
   * board, grouped by matching phone digits (7+ digits) or matching
   * lowercased full name (>3 chars), phone-matches take priority (a lead
   * already grouped by phone is excluded from a name group) — server-side
   * grouping logic, reproduced here only for display, not re-derived. */
  async list(boardId: string): Promise<DuplicateLeadGroup[]> {
    return apiFetch<DuplicateLeadGroup[]>(`/duplicated-leads?boardId=${encodeURIComponent(boardId)}`);
  },

  /** `DELETE /duplicated-leads` — `{leadIds}`, soft-deletes (into Trash,
   * same `deleted_at` mechanism as every other delete in this feature) and
   * unlinks the given leads from their chats. Returns `{deletedCount}`. */
  async removeMany(leadIds: string[]): Promise<{ deletedCount: number }> {
    return apiFetch<{ deletedCount: number }>(`/duplicated-leads`, {
      method: "DELETE",
      body: { leadIds },
    });
  },

  /** `POST /duplicated-leads/merge` — see this file's header comment.
   * Returns `{mergedInto, mergedCount}`. */
  async merge(primaryLeadId: string, duplicateLeadIds: string[]): Promise<{ mergedInto: string; mergedCount: number }> {
    return apiFetch<{ mergedInto: string; mergedCount: number }>(`/duplicated-leads/merge`, {
      method: "POST",
      body: { primaryLeadId, duplicateLeadIds },
    });
  },
};
