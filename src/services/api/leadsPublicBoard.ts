import { apiFetch } from "@/services/api/client";
import type { PublicLeadBoardSnapshot } from "@/features/leads/types";

/**
 * Unauthenticated public share-link view — `public-board.controller.ts`'s
 * `/public/boards/:token` (`@Public()`, no Bearer token required). The
 * password variant uses the `x-board-password` header on the `GET` (per the
 * controller's own doc comment); the `unlock` `POST` variant exists too but
 * this app always uses the `GET`+header form so a password isn't kept
 * around in component state any longer than the single request. A 401 means
 * "password required or incorrect" (not yet unlocked / wrong password); a
 * 404 means no enabled share link for this token (disabled, expired, or
 * never existed — deliberately indistinguishable, matching the backend's
 * own doc comment: "never reveals whether a link merely lapsed vs. never
 * existed").
 */
export const publicLeadBoardApi = {
  async get(token: string, password?: string): Promise<PublicLeadBoardSnapshot> {
    return apiFetch<PublicLeadBoardSnapshot>(`/public/boards/${encodeURIComponent(token)}`, {
      public: true,
      headers: password ? { "x-board-password": password } : undefined,
    });
  },
};
