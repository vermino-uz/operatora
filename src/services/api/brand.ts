import { apiFetch } from "@/services/api/client";
import type { BrandDraft, BrandProfile } from "@/features/brand/types";

/** Same confirmed exception as the rest of `services/api/*` — `workspace_id`
 * travels as an explicit query param, the backend also falls back to the
 * JWT's `workspaceId` claim but this app always sends it explicitly for
 * consistency with every other settings call. */
export const brandApi = {
  async get(workspaceId: string): Promise<BrandProfile> {
    return apiFetch<BrandProfile>(`/brand?workspace_id=${encodeURIComponent(workspaceId)}`);
  },

  async save(
    workspaceId: string,
    input: {
      logoUrl: string | null;
      colors: { hex: string; name?: string | null }[];
      fonts: string[];
      style: string | null;
      source?: Record<string, unknown> | null;
    },
  ): Promise<BrandProfile> {
    return apiFetch<BrandProfile>(`/brand?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "PUT",
      body: input,
    });
  },

  /** Extraction only — returns a draft the user must review and explicitly
   * save via `save()`; nothing is persisted by this call. Screenshot/PDF
   * extraction (`POST /brand/analyze-files`) is deliberately not wired —
   * see PROGRESS.md. */
  async analyzeDomain(workspaceId: string, domain: string): Promise<BrandDraft> {
    return apiFetch<BrandDraft>(`/brand/analyze-domain?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body: { domain },
    });
  },
};
