/**
 * Shared helper for the `admin/*` service layer — every admin domain hits
 * `SuperAdminGuard`-protected `/admin/**` REST controllers on the real
 * backend (`dev.operatora/app/backend/src/admin/controllers/*`), confirmed
 * live per-controller (see PROGRESS.md Phase 2l). This just builds a clean
 * query string from a loosely-typed filters object, skipping
 * null/undefined/empty values — mirrors the old admin frontend's
 * `adminFetch({query})` convention on top of this repo's `apiFetch`.
 */
export function buildAdminQuery(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export interface AdminPaginated<T> {
  rows: T[];
  total: number;
  page: number;
  perPage: number;
}
