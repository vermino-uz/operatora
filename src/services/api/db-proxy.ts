import { apiFetch } from "@/services/api/client";
import { ApiError } from "@/types/api";

/**
 * Typed client for `POST /db/:table/query` (`db-proxy.controller.ts`) —
 * the real backend compat endpoint the old frontend's `supabase.from(table)`
 * calls are routed through by its own `src/lib/dbshim` (confirmed by
 * reading `dbshim/table-query.ts` directly, same discovery already noted
 * for the `avatars` bucket in General settings). Workspace/user scoping
 * (`table-registry.ts`'s `scope: 'workspace' | 'user'`) and role gating
 * (`readRoles`/`writeRoles`) are enforced entirely server-side from the
 * JWT — callers never pass `workspace_id` explicitly, matching every other
 * scoped table this proxy serves.
 *
 * Use this only for tables the old frontend accessed via generic
 * `supabase.from()` chains with no dedicated REST controller of their own
 * (currently: canned responses). Anything with its own controller
 * (departments, brand, team, ...) should keep using that instead — this is
 * a narrow compat seam, not a general-purpose ORM client.
 */

export type DbProxyFilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "is"
  | "in"
  | "notIn"
  | "contains"
  | "containedBy"
  | "cs"
  | "cd"
  | "overlaps"
  | "textSearch"
  | "filter";

export interface DbProxyFilter {
  column: string;
  op: DbProxyFilterOp;
  value: unknown;
}

export interface DbProxyOrder {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
}

export interface DbProxyRequestBody {
  method: "select" | "insert" | "update" | "delete" | "upsert";
  select?: string | null;
  filters?: DbProxyFilter[];
  order?: DbProxyOrder[];
  limit?: number;
  offset?: number;
  values?: unknown;
  onConflict?: string;
  returning?: "representation" | "minimal" | null;
}

export interface DbProxyResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count: number | null;
  status: number;
  statusText: string;
}

/** Runs a proxied query and throws a normalized `ApiError` if the response
 * body carries a semantic error (e.g. a `.single()`-style 0/many-rows case)
 * even though the HTTP layer itself returned 2xx — the proxy can encode
 * those without a non-2xx status (see `db-proxy.service.ts`). Actual
 * permission/validation failures (403/400) are thrown by `apiFetch` itself
 * via the normal HTTP-error path. */
export async function dbProxyQuery<T>(table: string, body: DbProxyRequestBody): Promise<T> {
  const res = await apiFetch<DbProxyResponse<T>>(`/db/${encodeURIComponent(table)}/query`, {
    method: "POST",
    body,
  });
  if (res.error) {
    throw new ApiError({ statusCode: res.status || 500, message: res.error.message, code: res.error.code });
  }
  return res.data as T;
}
