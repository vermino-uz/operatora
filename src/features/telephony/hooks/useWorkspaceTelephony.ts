"use client";

import { useQuery } from "@tanstack/react-query";

import { telephonyApi } from "@/services/api/telephony";

export function useWorkspaceSipTelephonyQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-telephony-sip", workspaceId],
    queryFn: () => telephonyApi.listSip(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useWorkspaceGsmTelephonyQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-telephony-gsm", workspaceId],
    queryFn: () => telephonyApi.listGsm(workspaceId as string),
    enabled: !!workspaceId,
  });
}
