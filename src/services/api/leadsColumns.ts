import { apiFetch } from "@/services/api/client";
import type { LeadBoardColumn } from "@/features/leads/types";

/**
 * Column (pipeline stage) CRUD — `leads-controller/columns/columns.controller.ts`/
 * `.service.ts` (`/columns`), Phase 2c-5. Distinct from `leadsBoardsApi.columns()`
 * (a minimal read-only picker) and from `leadsApi.getBoardData()`'s columns
 * (rendering data, filtered to exclude hidden columns server-side) — this is
 * the real management surface: create/update/delete/reorder, including the
 * WIP limit (`lead_limit`) and hidden-flag fields `CreateColumnDto`/
 * `UpdateColumnDto` accept. The two locked Sold/Rejected marker columns
 * (`special_stage_kind` set) reject rename/edit/delete server-side —
 * `ManageColumnsDialog` hides those affordances for them rather than letting
 * a request round-trip just to fail.
 */
export interface CreateColumnPayload {
  name: string;
  board_id: string;
  display_order?: number;
  color?: string;
  is_hidden?: boolean;
  description?: string;
  /** WIP limit — omit or `null` for unlimited. */
  lead_limit?: number | null;
}

export type UpdateColumnPayload = Partial<Omit<CreateColumnPayload, "board_id">>;

export const columnsApi = {
  /** `GET /columns?boardId=` — every column on the board (hidden included;
   * unlike `getBoardData()`'s rendering query, which excludes hidden
   * columns), for the management dialog's own list. */
  async list(boardId: string): Promise<LeadBoardColumn[]> {
    return apiFetch<LeadBoardColumn[]>(`/columns?boardId=${encodeURIComponent(boardId)}`);
  },

  async create(payload: CreateColumnPayload): Promise<LeadBoardColumn> {
    return apiFetch<LeadBoardColumn>(`/columns`, { method: "POST", body: payload });
  },

  async update(columnId: string, payload: UpdateColumnPayload): Promise<LeadBoardColumn> {
    return apiFetch<LeadBoardColumn>(`/columns/${encodeURIComponent(columnId)}`, {
      method: "PATCH",
      body: payload,
    });
  },

  /** `DELETE /columns/:id` — a 400 means either it's the locked default
   * stage or it still has active leads (both real, server-enforced —
   * surfaced via `leadActionErrorMessage`, never pre-guessed client-side
   * beyond disabling the button for the known always-blocked cases: default
   * and marker columns). */
  async remove(columnId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/columns/${encodeURIComponent(columnId)}`, { method: "DELETE" });
  },

  /** `POST /columns/reorder` — move one column up/down relative to its
   * siblings (skips locked marker columns server-side). Simpler than a
   * drag-and-drop reorder UI + `/columns/order`'s full-array endpoint — this
   * feature already deliberately avoids `@dnd-kit/sortable` (see
   * `KanbanBoard.tsx`'s doc comment for why), and up/down buttons cover the
   * same real capability without a second DnD dependency. */
  async reorder(boardId: string, columnId: string, direction: "up" | "down"): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/columns/reorder`, {
      method: "POST",
      body: { board_id: boardId, column_id: columnId, direction },
    });
  },
};
