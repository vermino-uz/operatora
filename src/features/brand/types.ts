/**
 * Brand identity — traced against the real backend `brand/brand.controller.ts`
 * (`/brand/*`) and `brand.service.ts`. `GET /brand` reads the workspace's
 * saved profile from `workspace_agent_profile`; `PUT /brand` saves a
 * confirmed profile (admin/owner only, enforced server-side). The saved
 * logo is a plain HTTPS URL (`saveBrand` rejects anything else) — there is
 * no dedicated brand-logo upload endpoint; a URL is pasted directly or
 * carried over from a domain analysis draft, matching the old frontend's
 * `BrandProfilePanel.tsx`.
 */
export interface BrandColor {
  hex: string;
  name?: string | null;
}

export interface BrandProfile {
  logoUrl: string | null;
  colors: BrandColor[];
  fonts: string[];
  style: string | null;
  source: Record<string, unknown> | null;
  updatedAt: string | null;
}

export interface BrandDraft {
  logoUrl: string | null;
  colors: BrandColor[];
  fonts: string[];
  style: string | null;
  source: Record<string, unknown>;
}
