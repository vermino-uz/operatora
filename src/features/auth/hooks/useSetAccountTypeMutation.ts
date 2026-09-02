"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, type SetAccountTypePayload } from "@/services/api/auth";
import { useSessionStore } from "@/state/session-store";

export function useSetAccountTypeMutation() {
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "account-type"],
    mutationFn: (payload: SetAccountTypePayload) => authApi.setAccountType(payload),
    retry: false,
    onSuccess: (me) => {
      setSession({
        user: me.user,
        roles: me.roles,
        workspaceId: me.workspaceId ?? null,
      });
      queryClient.setQueryData(["auth", "me"], me);
    },
  });
}
