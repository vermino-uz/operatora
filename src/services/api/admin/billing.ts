import { apiFetch } from "@/services/api/client";
import type {
  BillingNotificationPreviewRow,
  BillingNotificationSettings,
  BillingOverview,
  UpdateBillingNotificationSettingsPatch,
} from "@/features/admin/types";

/** `/admin/billing/*` — confirmed against `admin-billing.controller.ts`. */
export const adminBillingApi = {
  overview(): Promise<BillingOverview> {
    return apiFetch<BillingOverview>("/admin/billing/overview");
  },
  notificationSettings(): Promise<BillingNotificationSettings> {
    return apiFetch<BillingNotificationSettings>("/admin/billing/notifications/settings");
  },
  updateNotificationSettings(patch: UpdateBillingNotificationSettingsPatch): Promise<BillingNotificationSettings> {
    return apiFetch<BillingNotificationSettings>("/admin/billing/notifications/settings", {
      method: "PATCH",
      body: patch,
    });
  },
  notificationPreview(): Promise<BillingNotificationPreviewRow[]> {
    return apiFetch<BillingNotificationPreviewRow[]>("/admin/billing/notifications/preview");
  },
  sendRemindersNow(): Promise<{ sent: number } | Record<string, unknown>> {
    return apiFetch("/admin/billing/notifications/send-reminders", { method: "POST", body: {} });
  },
};
