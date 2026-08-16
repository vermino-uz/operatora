"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/api/auth";
import { useSessionStore } from "@/state/session-store";

export function useLogoutMutation() {
  const clear = useSessionStore((s) => s.clear);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: () => authApi.logout(),
    retry: false,
    onSettled: () => {
      // Always clear, even on failure — see authApi.logout's own comment.
      clear();
      queryClient.clear();
    },
  });
}
