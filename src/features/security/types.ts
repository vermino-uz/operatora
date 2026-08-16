/**
 * Security — traced against the real backend
 * `settings-controller/admin-console/security.controller.ts` (`/security/*`).
 * No 2FA endpoint exists on the backend — not built here, see
 * PROGRESS.md.
 */
export interface SecuritySession {
  id: string;
  created_at: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
}
