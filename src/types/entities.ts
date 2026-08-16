/**
 * Hand-written domain types for entities the auth/scaffolding layer touches.
 * Feature-specific entities (Lead, Conversation, ...) belong in their own
 * `features/<name>/schema.ts`, not here — this file stays intentionally
 * small until Swagger-generated types are wired up (see ARCHITECTURE.md
 * Open Question 5).
 */

/** Global RBAC roles — `app_role` Postgres enum on the backend. */
export type AppRole =
  | "admin"
  | "moderator"
  | "user"
  | "sales_manager"
  | "operator"
  | "demo_admin"
  | "finance_manager"
  | "marketing_agent"
  | "super_admin";

export interface AuthUser {
  id: string;
  email: string | null;
  phone?: string | null;
  full_name?: string | null;
  [key: string]: unknown;
}

/** Response shape of POST /api/auth/login, /api/auth/register, /api/auth/refresh. */
export interface AuthSession {
  user: AuthUser;
  roles: AppRole[];
  workspaceId?: string;
  access_token: string;
}

/** Response shape of GET /api/auth/me. */
export interface AuthMe {
  user: AuthUser;
  roles: AppRole[];
  workspaceId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  owner_id: string;
  subscription_tier?: string;
  subscription_status?: string;
  [key: string]: unknown;
}
