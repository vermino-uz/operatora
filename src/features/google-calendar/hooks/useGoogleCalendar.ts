"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { googleCalendarApi } from "@/services/api/googleCalendar";

const statusKey = ["google-calendar-status"] as const;

export function useGoogleCalendarStatusQuery(enabled = true) {
  return useQuery({
    queryKey: statusKey,
    queryFn: () => googleCalendarApi.status(),
    enabled,
    staleTime: 30_000,
  });
}

export function useGoogleCalendarOAuthUrlMutation() {
  return useMutation({
    mutationFn: (redirectUri: string) => googleCalendarApi.getOAuthUrl(redirectUri),
  });
}

export function useDisconnectGoogleCalendarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => googleCalendarApi.disconnect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: statusKey }),
  });
}
