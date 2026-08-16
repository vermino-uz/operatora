"use client";

import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, TextArea, TextField } from "@heroui/react";
import { Plus, Xmark } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/types/api";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import {
  brandDomainSchema,
  brandSettingsSchema,
  type BrandDomainFormValues,
  type BrandSettingsFormValues,
} from "@/features/brand/schema";
import { useAnalyzeDomainMutation, useBrandQuery, useSaveBrandMutation } from "@/features/brand/hooks/useBrandHooks";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only the workspace owner or an admin can manage brand identity.";
    if (error.isValidationError) return error.message;
    if (error.statusCode === 422) return error.message || "Couldn't read that site — try screenshots instead.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function toFormValues(profile: {
  logoUrl: string | null;
  colors: { hex: string; name?: string | null }[];
  fonts: string[];
  style: string | null;
}): BrandSettingsFormValues {
  return {
    logoUrl: profile.logoUrl ?? "",
    colors: profile.colors.map((c) => ({ hex: c.hex, name: c.name ?? "" })),
    fonts: profile.fonts.join(", "),
    style: profile.style ?? "",
  };
}

/**
 * Brand identity — `GET/PUT /brand`. Manual entry (logo URL paste, color
 * swatches, comma-separated fonts, a free-text style description) plus the
 * one AI-assisted intake this pass wires up: `POST /brand/analyze-domain`
 * populates a draft into the same form fields for review — nothing is
 * auto-saved. Screenshot/PDF extraction (`POST /brand/analyze-files`) is
 * deliberately deferred (its own multipart upload flow, secondary path in
 * the old frontend) — see PROGRESS.md.
 */
export function BrandSettingsForm() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const brandQuery = useBrandQuery(workspaceId);
  const saveBrand = useSaveBrandMutation(workspaceId);
  const analyzeDomain = useAnalyzeDomainMutation(workspaceId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<BrandSettingsFormValues>({
    resolver: zodResolver(brandSettingsSchema),
    values: brandQuery.data ? toFormValues(brandQuery.data) : undefined,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "colors" });
  const logoUrl = useWatch({ control, name: "logoUrl" });

  const domainForm = useForm<BrandDomainFormValues>({
    resolver: zodResolver(brandDomainSchema),
    defaultValues: { domain: "" },
  });

  const onAnalyze = domainForm.handleSubmit(async (values) => {
    if (analyzeDomain.isPending) return; // guard double-submit
    setAnalyzeError(null);
    try {
      const draft = await analyzeDomain.mutateAsync(values.domain.trim());
      setValue("logoUrl", draft.logoUrl ?? "", { shouldDirty: true });
      setValue(
        "colors",
        draft.colors.map((c) => ({ hex: c.hex, name: c.name ?? "" })),
        { shouldDirty: true },
      );
      setValue("fonts", draft.fonts.join(", "), { shouldDirty: true });
      setValue("style", draft.style ?? "", { shouldDirty: true });
    } catch (err) {
      setAnalyzeError(actionErrorMessage(err));
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    if (saveBrand.isPending) return; // guard double-submit
    setSaveError(null);
    setJustSaved(false);
    try {
      await saveBrand.mutateAsync({
        logoUrl: values.logoUrl?.trim() || null,
        colors: values.colors.map((c) => ({ hex: c.hex, name: c.name?.trim() || null })),
        fonts: (values.fonts ?? "")
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        style: values.style?.trim() || null,
      });
      setJustSaved(true);
    } catch (err) {
      setSaveError(actionErrorMessage(err));
    }
  });

  const shellProps = {
    title: "Brand identity",
    subtitle: "Logo, colors and style the AI uses in every generation.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  if (brandQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading brand profile…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (brandQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={brandQuery.error} onRetry={() => brandQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  return (
    <SettingsSectionShell {...shellProps}>
      <div className="mb-6 rounded-xl border border-dashed border-black/[0.12] p-4 dark:border-white/[0.16]">
        <p className="text-sm font-medium text-foreground">Extract from a website</p>
        <p className="mt-0.5 text-sm text-foreground/60">
          Pulls a logo, palette, fonts and style from a public domain into the fields below for you to review — nothing
          saves until you press Save.
        </p>
        <form className="mt-3 flex items-end gap-3" onSubmit={onAnalyze} noValidate>
          <Controller
            name="domain"
            control={domainForm.control}
            render={({ field, fieldState }) => (
              <TextField {...field} isInvalid={fieldState.invalid} className="max-w-xs flex-1">
                <Label>Domain</Label>
                <Input placeholder="example.com" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
          <Button type="submit" variant="secondary" isDisabled={analyzeDomain.isPending}>
            {analyzeDomain.isPending ? "Analyzing…" : "Analyze"}
          </Button>
        </form>
        {analyzeError ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {analyzeError}
          </p>
        ) : null}
      </div>

      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-origin brand logo URL, not an optimizable local asset
            <img
              src={logoUrl}
              alt="Brand logo preview"
              className="size-14 shrink-0 rounded-lg border border-black/[0.08] object-contain p-1.5 dark:border-white/[0.12]"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          ) : null}
          <Controller
            name="logoUrl"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} isInvalid={fieldState.invalid} className="flex-1">
                <Label>Logo URL</Label>
                <Input placeholder="https://…" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
        </div>

        <div>
          <Label>Colors</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center gap-1.5 rounded-full border border-black/[0.08] py-1 pr-1 pl-1.5 dark:border-white/[0.12]"
              >
                <Controller
                  name={`colors.${index}.hex`}
                  control={control}
                  render={({ field: hexField }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className="size-4 shrink-0 rounded-full border border-black/[0.08] dark:border-white/[0.15]"
                        style={{ backgroundColor: hexField.value }}
                      />
                      <input
                        {...hexField}
                        aria-label={`Color ${index + 1} hex`}
                        className="w-[76px] bg-transparent text-xs text-foreground outline-none"
                      />
                    </>
                  )}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove color ${index + 1}`}
                  className="shrink-0 rounded-full p-0.5 text-foreground/40 hover:text-danger"
                >
                  <Xmark className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
            {fields.length < 8 ? (
              <button
                type="button"
                onClick={() => append({ hex: "#1a56db", name: "" })}
                className="flex items-center gap-1 rounded-full border border-dashed border-black/[0.15] px-3 py-1.5 text-xs text-foreground/60 hover:text-foreground dark:border-white/[0.2]"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add color
              </button>
            ) : null}
          </div>
        </div>

        <Controller
          name="fonts"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid}>
              <Label>Fonts</Label>
              <Input placeholder="Comma-separated, e.g. Inter, Montserrat" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          name="style"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid}>
              <Label>Visual style</Label>
              <TextArea rows={3} placeholder="A short description of the visual style the AI should follow." />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        {saveError ? (
          <p role="alert" className="text-sm text-danger">
            {saveError}
          </p>
        ) : null}
        {justSaved && !isDirty ? <p className="text-sm text-success">Saved.</p> : null}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" isDisabled={isSubmitting || saveBrand.isPending || !isDirty}>
            {isSubmitting || saveBrand.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </SettingsSectionShell>
  );
}
