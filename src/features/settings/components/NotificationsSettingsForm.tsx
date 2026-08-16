"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Switch } from "@heroui/react";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/types/api";
import { notificationsSchema, type NotificationsFormValues } from "@/features/settings/schema";
import { useWorkspaceSettingsQuery } from "@/features/settings/hooks/useWorkspaceSettingsQuery";
import { useUpdateNotificationsMutation } from "@/features/settings/hooks/useUpdateNotificationsMutation";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isAuthError) return "Your session has expired. Please sign in again.";
    if (error.isForbidden) return "You don't have permission to change notification settings.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Notifications — `PUT /workspace-settings/notifications`, distinct from
 * General settings' `/company` endpoint even though both live under the
 * same `GET /workspace-settings` read, hence reusing
 * `useWorkspaceSettingsQuery` here rather than a separate query. See
 * `features/settings/types.ts` for the exact traced contract and what's
 * deliberately out of scope (the old app's much larger Telegram-routing
 * rule builder under `/notification-rules/*`).
 */
export function NotificationsSettingsForm() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const settingsQuery = useWorkspaceSettingsQuery(workspaceId);
  const updateNotifications = useUpdateNotificationsMutation(workspaceId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const notifications = settingsQuery.data?.notifications ?? {};

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema),
    values: settingsQuery.data
      ? {
          email_new_lead: Boolean(notifications.email_new_lead),
          telegram_new_message: Boolean(notifications.telegram_new_message),
        }
      : undefined,
  });

  const onSubmit = handleSubmit(async (values) => {
    if (updateNotifications.isPending) return; // guard double-submit
    setSaveError(null);
    setJustSaved(false);
    try {
      await updateNotifications.mutateAsync({ values, existingNotifications: notifications });
      setJustSaved(true);
    } catch (err) {
      setSaveError(saveErrorMessage(err));
    }
  });

  const shellProps = {
    title: "Notifications",
    subtitle: "Choose which workspace events email and Telegram alerts fire for.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading notification settings…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (settingsQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={settingsQuery.error} onRetry={() => settingsQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  return (
    <SettingsSectionShell {...shellProps}>
      <form className="flex flex-col gap-1" onSubmit={onSubmit} noValidate>
        <Controller
          name="email_new_lead"
          control={control}
          render={({ field }) => (
            <label className="flex items-center justify-between gap-4 rounded-xl border border-black/[0.08] px-4 py-3.5 dark:border-white/[0.12]">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">New lead — email</span>
                <span className="block text-sm text-foreground/60">
                  Email the workspace when a new lead is created.
                </span>
              </span>
              <Switch isSelected={field.value} onChange={field.onChange} aria-label="New lead — email">
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </label>
          )}
        />

        <div className="h-3" />

        <Controller
          name="telegram_new_message"
          control={control}
          render={({ field }) => (
            <label className="flex items-center justify-between gap-4 rounded-xl border border-black/[0.08] px-4 py-3.5 dark:border-white/[0.12]">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">New message — Telegram</span>
                <span className="block text-sm text-foreground/60">
                  Notify linked Telegram accounts when a new message arrives. Link your own account under Security.
                </span>
              </span>
              <Switch
                isSelected={field.value}
                onChange={field.onChange}
                aria-label="New message — Telegram"
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </label>
          )}
        />

        {saveError ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {saveError}
          </p>
        ) : null}
        {justSaved && !isDirty ? <p className="mt-4 text-sm text-success">Saved.</p> : null}

        <div className="mt-5 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isDisabled={isSubmitting || updateNotifications.isPending || !isDirty}
          >
            {isSubmitting || updateNotifications.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </SettingsSectionShell>
  );
}
