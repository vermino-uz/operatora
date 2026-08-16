import { apiFetch } from "@/services/api/client";
import type { GsmLineRow, UpsertGsmLineInput } from "@/features/team/types";

/**
 * Per-operator GSM lines — `GET/POST/PATCH/DELETE /api/gsm`, scoped by a
 * `user_id` query param (not `workspace_id` — confirmed via
 * `gsm.controller.ts`, which resolves the target user purely from that
 * param, falling back to the caller's own id). Traced from the old
 * frontend's `OperatorGsmLinesPanel.tsx`.
 */
export const gsmApi = {
  async list(userId: string): Promise<GsmLineRow[]> {
    const data = await apiFetch<GsmLineRow[]>(`/gsm?user_id=${encodeURIComponent(userId)}`);
    return Array.isArray(data) ? data : [];
  },

  async create(userId: string, input: UpsertGsmLineInput): Promise<GsmLineRow> {
    return apiFetch(`/gsm?user_id=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: input,
    });
  },

  async update(userId: string, id: string, input: Partial<UpsertGsmLineInput>): Promise<GsmLineRow> {
    return apiFetch(`/gsm/${encodeURIComponent(id)}?user_id=${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: input,
    });
  },

  async remove(userId: string, id: string): Promise<void> {
    await apiFetch(`/gsm/${encodeURIComponent(id)}?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  },
};
