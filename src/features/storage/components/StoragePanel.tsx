"use client";

import { ProgressBar } from "@heroui/react";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { useBillingFeaturesQuery } from "@/features/team/hooks/useBilling";

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/**
 * File Storage — traced from the old frontend's `StorageManager.tsx`, whose
 * usage numbers came from a client-side, workspace-*unscoped* crawl of raw
 * Supabase Storage buckets (`supabase.storage.from(bucket).list()` across
 * all files, cross-referenced against this workspace's own conversation
 * rows only for the audio bucket — avatars/product-files were never
 * filtered per-workspace even there, per that file's own `TODO` comment).
 * The equivalent real backend endpoint for that raw bucket listing,
 * `GET /storage/:bucket/list`, has the same lack of workspace scoping
 * (`buckets.ts`: none of `conversations`/`avatars`/`product-files` set
 * `pathScope: 'workspace'`) — calling it here would either mislabel
 * platform-wide totals as this workspace's, or enumerate every other
 * tenant's file names. Neither is acceptable to reproduce even though the
 * old app effectively did the same thing.
 *
 * Instead this uses `GET /billing/me`'s `usage.storage_mb` — a real,
 * *already workspace-scoped* live SUM across every size-tracked table
 * (`plan-limits.service.ts`'s `getStorageUsageBytes()`), the same number
 * the backend itself enforces the plan's storage cap against. It has no
 * per-category breakdown (the backend doesn't expose one), so this shows
 * one accurate total instead of the old app's three-bucket breakdown,
 * which was already inaccurate outside the audio bucket.
 */
export function StoragePanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const billingQuery = useBillingFeaturesQuery(workspaceId);

  const shellProps = {
    title: "File Storage",
    subtitle: "Storage used by audio recordings, AI knowledge files, and other uploads in this workspace.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  if (billingQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading storage usage…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (billingQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={billingQuery.error} onRetry={() => billingQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  const usedMb = billingQuery.data?.usage.storage_mb ?? 0;
  const limitMb = billingQuery.data?.limits.storage_mb ?? null;
  const retentionDays = billingQuery.data?.limits.storage_retention_days ?? null;
  const pct = limitMb ? Math.min(100, (usedMb / limitMb) * 100) : 0;
  const nearLimit = limitMb !== null && pct >= 85;

  return (
    <SettingsSectionShell {...shellProps}>
      <div className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-sm text-foreground/60">Used</p>
            <p className="text-2xl font-semibold text-foreground">{formatMb(usedMb)}</p>
          </div>
          <p className="text-sm text-foreground/60">
            {limitMb === null ? "Unlimited on your plan" : `of ${formatMb(limitMb)} plan limit`}
          </p>
        </div>

        {limitMb !== null ? (
          <div className="mt-4">
            <ProgressBar value={usedMb} minValue={0} maxValue={limitMb} aria-label="Storage used">
              <ProgressBar.Track className="h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.1]">
                <ProgressBar.Fill
                  className={`h-full rounded-full ${nearLimit ? "bg-danger" : "bg-primary"}`}
                />
              </ProgressBar.Track>
            </ProgressBar>
            {nearLimit ? (
              <p className="mt-2 text-sm text-danger">
                You&apos;re close to your plan&apos;s storage limit. Upgrade your plan or free up space to avoid
                upload failures.
              </p>
            ) : null}
          </div>
        ) : null}

        {retentionDays !== null ? (
          <p className="mt-4 text-sm text-foreground/60">
            Your plan retains stored files for {retentionDays} days.
          </p>
        ) : (
          <p className="mt-4 text-sm text-foreground/60">Your plan has no automatic retention limit.</p>
        )}
      </div>

      {nearLimit ? (
        <a
          href="/checkout?cycle=yearly"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Upgrade your plan →
        </a>
      ) : null}

      {/*
       * Deliberately not built here (deferred, not forgotten — see
       * PROGRESS.md):
       * - Bulk-delete-by-date-range cleanup: the old frontend's flow ends
       *   in a full conversation-row delete, but `DELETE /conversation/:id`
       *   is still a backend stub ("Delete not implemented yet" —
       *   `conversation.service.ts`), same finding as the Conversations
       *   settings pass. Building a delete UI against a stub would be
       *   fabricating a working feature.
       * - Retention-policy dropdowns (auto-delete audio/transcripts,
       *   compress-after) — in the old frontend these were pure decorative
       *   local state with no backend persistence at all (no save action,
       *   no endpoint); not reproduced since they never actually did
       *   anything there either.
       */}
    </SettingsSectionShell>
  );
}
