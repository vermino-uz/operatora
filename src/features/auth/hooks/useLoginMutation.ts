"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, type LoginPayload } from "@/services/api/auth";
import { useSessionStore } from "@/state/session-store";

/**
 * Login is not idempotent-safe to auto-retry (rotates the single web
 * session server-side) — `retry: false`, and the mutation key guards
 * against a double-click firing two concurrent submits (HeroUI Button's
 * `isDisabled`/`isPending` wiring in the login form also prevents this at
 * the UI layer; this is the network-layer backstop).
 */
export function useLoginMutation() {
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "login"],
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    retry: false,
    onSuccess: (session) => {
      setSession({ user: session.user, roles: session.roles, workspaceId: session.workspaceId });
      queryClient.setQueryData(["auth", "me"], {
        user: session.user,
        roles: session.roles,
        workspaceId: session.workspaceId,
      });
    },
  });
}
