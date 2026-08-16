import { create } from "zustand";
import type { AppRole, AuthUser } from "@/types/entities";

export type SessionStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface SessionState {
  status: SessionStatus;
  user: AuthUser | null;
  roles: AppRole[];
  /** Active workspace id — selected, not fetched; server data about the
   * workspace itself (name, plan, ...) lives in TanStack Query, never here.
   * See ARCHITECTURE.md "State Boundaries". */
  workspaceId: string | null;
  setStatus: (status: SessionStatus) => void;
  setSession: (params: { user: AuthUser; roles: AppRole[]; workspaceId?: string | null }) => void;
  setWorkspaceId: (workspaceId: string | null) => void;
  clear: () => void;
}

/**
 * Global client state for the current auth session (UI/session concern —
 * not server data). Populated from `/api/auth/login` or `/api/auth/me`,
 * cleared on logout / forced logout (SESSION_SUPERSEDED, refresh failure).
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: "idle",
  user: null,
  roles: [],
  workspaceId: null,
  setStatus: (status) => set({ status }),
  setSession: ({ user, roles, workspaceId }) =>
    set({ status: "authenticated", user, roles, workspaceId: workspaceId ?? null }),
  setWorkspaceId: (workspaceId) => set({ workspaceId }),
  clear: () => set({ status: "unauthenticated", user: null, roles: [], workspaceId: null }),
}));
