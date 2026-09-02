"use client";

import { useMutation } from "@tanstack/react-query";
import { authApi, type RegisterPayload } from "@/services/api/auth";
import { useSessionStore } from "@/state/session-store";
import { useQueryClient } from "@tanstack/react-query";

export function useRegisterMutation() {
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "register"],
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    retry: false,
    onSuccess: (session) => {
      setSession({
        user: session.user,
        roles: session.roles,
        workspaceId: session.workspaceId ?? null,
      });
      queryClient.setQueryData(["auth", "me"], {
        user: session.user,
        roles: session.roles,
        workspaceId: session.workspaceId,
      });
    },
  });
}
