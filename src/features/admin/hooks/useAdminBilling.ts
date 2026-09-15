import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminBillingApi } from "@/services/api/admin/billing";
import type { UpdateBillingNotificationSettingsPatch } from "@/features/admin/types";

export function useAdminBillingOverviewQuery() {
  return useQuery({
    queryKey: ["admin", "billing", "overview"],
    queryFn: () => adminBillingApi.overview(),
  });
}

export function useAdminBillingNotificationSettingsQuery() {
  return useQuery({
    queryKey: ["admin", "billing", "notifications", "settings"],
    queryFn: () => adminBillingApi.notificationSettings(),
  });
}

export function useAdminBillingNotificationPreviewQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "billing", "notifications", "preview"],
    queryFn: () => adminBillingApi.notificationPreview(),
    enabled,
  });
}

export function useUpdateAdminBillingNotificationSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateBillingNotificationSettingsPatch) => adminBillingApi.updateNotificationSettings(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "billing", "notifications"] }),
  });
}

export function useSendAdminBillingRemindersMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminBillingApi.sendRemindersNow(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "billing", "notifications", "preview"] }),
  });
}
