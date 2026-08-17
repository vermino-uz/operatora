"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adsApi } from "@/services/api/ads";
import type { AdsAudience, AdsBillingMode, AdsSchedule } from "@/features/ads/types";

const statusKey = ["ads-status"] as const;
const campaignsKey = ["ads-campaigns"] as const;

export function useAdsStatusQuery() {
  return useQuery({ queryKey: statusKey, queryFn: () => adsApi.status(), refetchOnMount: "always" });
}

export function useAdsCampaignsQuery() {
  return useQuery({ queryKey: campaignsKey, queryFn: () => adsApi.campaigns(), refetchOnMount: "always" });
}

export function useAdsConnectMutation() {
  return useMutation({ mutationFn: (billingMode: AdsBillingMode) => adsApi.connect(billingMode) });
}

function useRefreshCampaigns() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: campaignsKey });
}

export function useUpdateBudgetMutation() {
  const refresh = useRefreshCampaigns();
  return useMutation({
    mutationFn: (params: { campaignId: string; dailyBudget: number }) => adsApi.updateBudget(params),
    onSuccess: () => void refresh(),
  });
}

export function useUpdateAudienceMutation() {
  const refresh = useRefreshCampaigns();
  return useMutation({
    mutationFn: (params: { campaignId: string; audience: AdsAudience }) => adsApi.updateAudience(params),
    onSuccess: () => void refresh(),
  });
}

export function useUpdateScheduleMutation() {
  const refresh = useRefreshCampaigns();
  return useMutation({
    mutationFn: (params: { campaignId: string; schedule: AdsSchedule }) => adsApi.updateSchedule(params),
    onSuccess: () => void refresh(),
  });
}

export function useSetCampaignStatusMutation() {
  const refresh = useRefreshCampaigns();
  return useMutation({
    mutationFn: (params: { campaignId: string; status: "active" | "paused" }) => adsApi.setStatus(params),
    onSuccess: () => void refresh(),
  });
}

export function useSetCreativeStatusMutation() {
  const refresh = useRefreshCampaigns();
  return useMutation({
    mutationFn: (params: { adId: string; status: "active" | "paused" }) => adsApi.setCreativeStatus(params),
    onSuccess: () => void refresh(),
  });
}
