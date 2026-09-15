"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminKpiCard } from "@/features/admin/components/AdminKpiCard";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";
import { formatDate } from "@/features/admin/formatters";
import {
  useAdminBillingNotificationPreviewQuery,
  useAdminBillingNotificationSettingsQuery,
  useAdminBillingOverviewQuery,
  useSendAdminBillingRemindersMutation,
  useUpdateAdminBillingNotificationSettingsMutation,
} from "@/features/admin/hooks/useAdminBilling";

/** `/admin/billing/*` — real, confirmed against `admin-billing.controller.ts`
 * + `admin-billing-notifications.service.ts`. Ported from the old
 * `pages/Billing.tsx` (which only wired the overview) plus the
 * notification settings/preview/send-reminders endpoints the old page's
 * hooks never actually called despite the controller supporting them. */
export default function AdminBillingPage() {
  const overview = useAdminBillingOverviewQuery();
  const settings = useAdminBillingNotificationSettingsQuery();
  const updateSettings = useUpdateAdminBillingNotificationSettingsMutation();
  const [showPreview, setShowPreview] = useState(false);
  const preview = useAdminBillingNotificationPreviewQuery(showPreview);
  const sendNow = useSendAdminBillingRemindersMutation();
  const [sendResult, setSendResult] = useState<string | null>(null);

  if (overview.isLoading) return <LoadingState label="Loading billing overview…" className="py-16" />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => overview.refetch()} className="py-16" />;
  const data = overview.data;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-foreground/60">Platform-wide subscription overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminKpiCard label="Workspaces" value={data.totalWorkspaces} />
        <AdminKpiCard label="Trials ending soon" value={data.trialingSoon.length} />
        <AdminKpiCard label="Suspended" value={data.suspended.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminSectionCard title="By tier">
          <ul className="flex flex-col gap-1 text-sm">
            {data.byTier.map((t) => (
              <li key={t.tier} className="flex justify-between border-b border-divider/60 py-1.5 last:border-b-0">
                <span className="capitalize text-foreground">{t.tier}</span>
                <span className="text-foreground/60">{t.count}</span>
              </li>
            ))}
          </ul>
        </AdminSectionCard>
        <AdminSectionCard title="By status">
          <ul className="flex flex-col gap-1 text-sm">
            {data.byStatus.map((s) => (
              <li key={s.status} className="flex justify-between border-b border-divider/60 py-1.5 last:border-b-0">
                <span className="capitalize text-foreground">{s.status}</span>
                <span className="text-foreground/60">{s.count}</span>
              </li>
            ))}
          </ul>
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Trials ending soon">
        {data.trialingSoon.length === 0 ? (
          <EmptyState title="None" />
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.trialingSoon.map((w) => (
              <li key={w.id} className="flex justify-between border-b border-divider/60 py-1.5 last:border-b-0">
                <span className="text-foreground">{w.name}</span>
                <span className="text-foreground/60">
                  {w.ownerEmail ?? "—"} · ends {formatDate(w.trialEndsAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSectionCard>

      <AdminSectionCard title="Suspended">
        {data.suspended.length === 0 ? (
          <EmptyState title="None" />
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.suspended.map((w) => (
              <li key={w.id} className="flex justify-between border-b border-divider/60 py-1.5 last:border-b-0">
                <span className="text-foreground">{w.name}</span>
                <span className="text-foreground/60">
                  {w.reason ?? "—"} · {formatDate(w.suspendedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Billing reminder notifications"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onPress={() => setShowPreview(true)}>
              Preview
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isDisabled={sendNow.isPending}
              onPress={() =>
                sendNow.mutate(undefined, {
                  onSuccess: () => setSendResult("Reminder send triggered."),
                  onError: () => setSendResult("Failed to send reminders."),
                })
              }
            >
              Send now
            </Button>
          </div>
        }
      >
        {settings.isLoading ? <LoadingState label="Loading settings…" /> : null}
        {settings.isError ? <ErrorState error={settings.error} onRetry={() => settings.refetch()} /> : null}
        {settings.data ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["enabled", "Enabled"],
                  ["smsEnabled", "SMS"],
                  ["inAppEnabled", "In-app"],
                  ["emailEnabled", "Email"],
                  ["notifyOnGrace", "Notify on grace period"],
                  ["notifyOnPastDue", "Notify on past due"],
                  ["notifyOnSuspended", "Notify on suspended"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.data?.[key])}
                    onChange={(e) => updateSettings.mutate({ [key]: e.target.checked })}
                    className="size-4 cursor-pointer accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-xs text-foreground/50">
              Reminders start {settings.data.daysBeforeExpiry} day(s) before expiry, with a {settings.data.graceDays}-day grace period.
            </p>
          </div>
        ) : null}
        {sendResult ? <p className="mt-2 text-sm text-foreground/70">{sendResult}</p> : null}
        {showPreview ? (
          <div className="mt-3">
            {preview.isLoading ? <LoadingState label="Loading preview…" /> : null}
            {preview.isError ? <ErrorState error={preview.error} onRetry={() => preview.refetch()} /> : null}
            {preview.data && preview.data.length === 0 ? <EmptyState title="Nothing pending" /> : null}
            {preview.data && preview.data.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">
                {preview.data.map((row, i) => (
                  <li key={i} className="border-b border-divider/60 py-1.5 last:border-b-0">
                    {row.workspaceName} · {row.channel} · {row.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </AdminSectionCard>
    </div>
  );
}
