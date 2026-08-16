import { apiFetch } from "@/services/api/client";
import type { LeadBoardShareSettings } from "@/features/leads/types";

/**
 * `/boards/*` data layer — originally a deliberately minimal read-only
 * picker (list/columns) for Google Sheets/Lead Automations/Tasks Settings'
 * board+column selects; extended in Phase 2c-5 with real board management
 * (create/rename/delete) and share-link settings (`board.controller.ts`'s
 * `/boards/:id/share*`), since those genuinely belong on this same
 * `leads_boards` resource rather than a second file. The original picker
 * methods (`list`/`columns`) are unchanged — still used as-is by every
 * existing caller. Traced from `leads-controller/board/board.controller.ts`/
 * `.service.ts`.
 */
export interface LeadsBoardOption {
  id: string;
  name: string;
}

export interface LeadsBoardColumnOption {
  id: string;
  name: string;
}

export const leadsBoardsApi = {
  async list(workspaceId: string): Promise<LeadsBoardOption[]> {
    const res = await apiFetch<LeadsBoardOption[] | { boards: LeadsBoardOption[] }>(
      `/boards?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return Array.isArray(res) ? res : (res.boards ?? []);
  },

  async columns(boardId: string): Promise<LeadsBoardColumnOption[]> {
    const res = await apiFetch<LeadsBoardColumnOption[] | { columns: LeadsBoardColumnOption[] }>(
      `/boards/${encodeURIComponent(boardId)}/columns`,
    );
    return Array.isArray(res) ? res : (res.columns ?? []);
  },

  /** `POST /boards` — creates a board pre-seeded with the default pipeline
   * (`BoardService.create()` inserts the 6 default columns + Sold/Rejected
   * markers server-side), so it's usable immediately, matching every other
   * board in the workspace. */
  async create(name: string): Promise<LeadsBoardOption> {
    return apiFetch<LeadsBoardOption>(`/boards`, { method: "POST", body: { name } });
  },

  /** `PATCH /boards/:id` — name/display_order only (`UpdateBoardDto`); the
   * service strips any `share_*` field even if sent, so this can never be
   * used to bypass the dedicated share endpoints below. */
  async rename(boardId: string, name: string): Promise<LeadsBoardOption> {
    return apiFetch<LeadsBoardOption>(`/boards/${encodeURIComponent(boardId)}`, {
      method: "PATCH",
      body: { name },
    });
  },

  /** `DELETE /boards/:id` — a 400 means this is the workspace's default
   * board (first by `display_order`/`created_at`), which the backend never
   * allows deleting (confirmed in `BoardService.remove()`) — surfaced via
   * `leadActionErrorMessage`, not pre-blocked client-side (the client has no
   * cheap way to know which board is "the default" without duplicating that
   * ordering rule). */
  async remove(boardId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/boards/${encodeURIComponent(boardId)}`, { method: "DELETE" });
  },

  async getShare(boardId: string): Promise<LeadBoardShareSettings> {
    return apiFetch<LeadBoardShareSettings>(`/boards/${encodeURIComponent(boardId)}/share`);
  },

  /** `PATCH /boards/:id/share` — `{enabled?, password?, expiresAt?}`.
   * `password: null` clears it (fully public link); `expiresAt: null` makes
   * it permanent. Omitting a key leaves it unchanged server-side. */
  async updateShare(
    boardId: string,
    payload: { enabled?: boolean; password?: string | null; expiresAt?: string | null },
  ): Promise<LeadBoardShareSettings> {
    return apiFetch<LeadBoardShareSettings>(`/boards/${encodeURIComponent(boardId)}/share`, {
      method: "PATCH",
      body: payload,
    });
  },

  /** `POST /boards/:id/share/rotate` — issues a new token, invalidating the
   * previous public link immediately. */
  async rotateShare(boardId: string): Promise<{ token: string }> {
    return apiFetch<{ token: string }>(`/boards/${encodeURIComponent(boardId)}/share/rotate`, { method: "POST" });
  },
};
