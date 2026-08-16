"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, ListBox, Select, TextField } from "@heroui/react";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/types/api";
import { generalSettingsSchema, type GeneralSettingsFormValues } from "@/features/settings/schema";
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, PHONE_FORMAT_OPTIONS } from "@/features/settings/types";
import { useWorkspaceSettingsQuery } from "@/features/settings/hooks/useWorkspaceSettingsQuery";
import { useUpdateCompanyMutation } from "@/features/settings/hooks/useUpdateCompanyMutation";
import { WorkspaceLogoUploader } from "@/features/settings/components/WorkspaceLogoUploader";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";

const PHONE_FORMAT_SELECT_OPTIONS = PHONE_FORMAT_OPTIONS.map((v) => ({ id: v, label: v }));
const CURRENCY_LABELS: Record<(typeof CURRENCY_OPTIONS)[number], string> = {
  UZS: "UZS — Uzbekistani som",
  USD: "USD — US dollar",
};
const CURRENCY_SELECT_OPTIONS = CURRENCY_OPTIONS.map((v) => ({ id: v, label: CURRENCY_LABELS[v] }));
const LANGUAGE_LABELS: Record<(typeof LANGUAGE_OPTIONS)[number], string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};
const LANGUAGE_SELECT_OPTIONS = LANGUAGE_OPTIONS.map((v) => ({ id: v, label: LANGUAGE_LABELS[v] }));

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isAuthError) return "Your session has expired. Please sign in again.";
    if (error.isForbidden) return "You don't have permission to change workspace settings.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * General workspace settings — workspace name, default phone format,
 * default currency, and default language — backed by
 * `GET/PUT /workspace-settings`. `language` is tracked in the old
 * frontend's form state and sent on every save, but that frontend never
 * actually renders a control for it (likely an oversight there, not a
 * deliberate omission — it's consumed elsewhere, e.g. AI Chat's
 * `/ai-chat/v2` takes the same `uz`/`ru`/`en` set as a `language` param);
 * exposed here as a real field rather than silently round-tripped.
 *
 * Logo upload is real too — `POST/storage/avatars/*` is an actual traced
 * backend endpoint (confirmed via the backend source, not the old
 * frontend's Supabase-client call, which itself goes through a compat shim
 * to this same endpoint) — see `WorkspaceLogoUploader.tsx`.
 *
 * Deliberately out of scope for this pass (see PROGRESS.md): the
 * danger-zone actions (clear data / transfer ownership / delete workspace —
 * separate, higher-risk endpoints), and `timezone` (still round-tripped
 * unchanged — no evidence it's consumed anywhere else the way `language`
 * is, so no similar case to expose it yet).
 */
export function GeneralSettingsForm() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const settingsQuery = useWorkspaceSettingsQuery(workspaceId);
  const updateCompany = useUpdateCompanyMutation(workspaceId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const company = settingsQuery.data?.company ?? {};

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    values: settingsQuery.data
      ? {
          workspace_name: settingsQuery.data.workspace_name ?? "",
          phone_format:
            (company.phone_format as GeneralSettingsFormValues["phone_format"]) ?? PHONE_FORMAT_OPTIONS[0],
          currency: (company.currency as GeneralSettingsFormValues["currency"]) ?? CURRENCY_OPTIONS[0],
          language: (company.language as GeneralSettingsFormValues["language"]) ?? LANGUAGE_OPTIONS[0],
        }
      : undefined,
  });

  const onSubmit = handleSubmit(async (values) => {
    if (updateCompany.isPending) return; // guard double-submit
    setSaveError(null);
    setJustSaved(false);
    try {
      await updateCompany.mutateAsync({ values, existingCompany: company });
      setJustSaved(true);
    } catch (err) {
      setSaveError(saveErrorMessage(err));
    }
  });

  const shellProps = {
    title: "General",
    subtitle: "Configure your workspace name, timezone, and preferences.",
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
        <LoadingState label="Loading workspace settings…" className="py-16" />
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
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <WorkspaceLogoUploader
          workspaceId={workspaceId}
          workspaceName={settingsQuery.data?.workspace_name ?? ""}
          logoUrl={(company.logo_url as string | undefined) ?? null}
          existingCompany={company}
        />

        {/* 2-column grid — each field fills its own cell instead of a
            narrow single stacked column with empty space to the right. */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <Controller
            name="workspace_name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                <Label>Workspace name</Label>
                <Input placeholder="Acme Inc." />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />

          <Controller
            name="phone_format"
            control={control}
            render={({ field }) => (
              <Select
                aria-label="Phone format"
                value={field.value}
                onChange={(key) => {
                  if (typeof key === "string") field.onChange(key);
                }}
              >
                <Label>Default phone format</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={PHONE_FORMAT_SELECT_OPTIONS}>
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />

          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select
                aria-label="Currency"
                value={field.value}
                onChange={(key) => {
                  if (typeof key === "string") field.onChange(key);
                }}
              >
                <Label>Default currency</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={CURRENCY_SELECT_OPTIONS}>
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />

          <Controller
            name="language"
            control={control}
            render={({ field }) => (
              <Select
                aria-label="Language"
                value={field.value}
                onChange={(key) => {
                  if (typeof key === "string") field.onChange(key);
                }}
              >
                <Label>Default language</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={LANGUAGE_SELECT_OPTIONS}>
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
        </div>

        {saveError ? (
          <p role="alert" className="text-sm text-danger">
            {saveError}
          </p>
        ) : null}
        {justSaved && !isDirty ? <p className="text-sm text-success">Saved.</p> : null}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" isDisabled={isSubmitting || updateCompany.isPending || !isDirty}>
            {isSubmitting || updateCompany.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </SettingsSectionShell>
  );
}
