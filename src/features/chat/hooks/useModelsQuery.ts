"use client";

import { useQuery } from "@tanstack/react-query";
import { chatMiscApi } from "@/services/api/chat";

/** Populates the model selector — long staleTime, no realtime (plan/model
 * allowlist changes rarely, and a stale value just means the dropdown lags
 * a plan change by a few minutes, never a correctness issue). */
export function useModelsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["chat", "models", workspaceId],
    queryFn: () => chatMiscApi.models(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
  });
}
