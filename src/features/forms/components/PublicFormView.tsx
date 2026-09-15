"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, ListBox, Select, TextArea, TextField } from "@heroui/react";
import { Check } from "@gravity-ui/icons";

import { publicFormsApi } from "@/services/api/publicForms";
import {
  buildPublicFormSchema,
  cleanPublicFormValues,
  defaultPublicFormValues,
  type PublicFormValues,
} from "@/features/forms/publicFormSchema";
import type { PublicFormField } from "@/features/forms/publicFormTypes";
import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

function loadErrorContent(error: unknown): { title: string; description: string } {
  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return { title: "You're offline", description: "Check your connection and reload this page." };
    }
    if (error.isNotFound) {
      return { title: "Form not found", description: "This form link is invalid or no longer available." };
    }
    if (error.isServerError) {
      return { title: "Something went wrong", description: "Couldn't load this form. Please try again shortly." };
    }
    return { title: "Couldn't load this form", description: error.message };
  }
  return { title: "Couldn't load this form", description: "Please try again shortly." };
}

function submitErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isValidationError) return error.message;
    if (error.isNotFound || error.statusCode === 501) {
      return "Submitting this form isn't available yet. Please contact the business directly.";
    }
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function PublicFormField({
  field,
  control,
}: {
  field: PublicFormField;
  control: Control<PublicFormValues>;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: rhf, fieldState }) => (
            <TextField
              value={typeof rhf.value === "string" ? rhf.value : ""}
              onChange={rhf.onChange}
              onBlur={rhf.onBlur}
              isInvalid={fieldState.invalid}
              isRequired={field.required}
            >
              <Label>{field.label}</Label>
              <TextArea placeholder={field.placeholder} rows={4} />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      );

    case "select": {
      const options = (field.options ?? []).map((o) => ({ id: o, label: o }));
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: rhf, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Select
                aria-label={field.label}
                value={typeof rhf.value === "string" && rhf.value ? rhf.value : undefined}
                placeholder={field.placeholder || "Select…"}
                isInvalid={fieldState.invalid}
                onChange={(key) => rhf.onChange(typeof key === "string" ? key : "")}
              >
                <Label>
                  {field.label}
                  {field.required ? <span className="ml-1 text-danger">*</span> : null}
                </Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={options}>
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
              {fieldState.error?.message ? <p className="text-sm text-danger">{fieldState.error.message}</p> : null}
            </div>
          )}
        />
      );
    }

    case "checkbox":
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: rhf, fieldState }) => (
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={rhf.value === true}
                  onChange={(e) => rhf.onChange(e.target.checked)}
                  className="size-4 rounded-md border-black/20 dark:border-white/20"
                />
                {field.label}
                {field.required ? <span className="text-danger">*</span> : null}
              </label>
              {fieldState.error?.message ? <p className="text-sm text-danger">{fieldState.error.message}</p> : null}
            </div>
          )}
        />
      );

    case "email":
    case "phone":
    case "number":
    case "text":
    default:
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: rhf, fieldState }) => (
            <TextField
              value={typeof rhf.value === "string" ? rhf.value : ""}
              onChange={rhf.onChange}
              onBlur={rhf.onBlur}
              isInvalid={fieldState.invalid}
              isRequired={field.required}
            >
              <Label>{field.label}</Label>
              <Input
                type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "text" : "text"}
                inputMode={field.type === "number" ? "decimal" : undefined}
                placeholder={field.placeholder}
              />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      );
  }
}

/**
 * `/form/:formId` — public, unauthenticated form-submission view. See
 * `features/forms/publicFormTypes.ts` for the full backend-contract writeup
 * (including the confirmed-missing submit route).
 */
export function PublicFormView({ formId }: { formId: string }) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formQuery = useQuery({
    queryKey: ["public-form", formId],
    queryFn: () => publicFormsApi.get(formId),
    enabled: Boolean(formId),
    retry: (failureCount, error) => {
      // Don't burn retries on a definitively-missing/invalid form — only
      // transient (network/5xx) failures are worth an automatic retry.
      if (error instanceof ApiError && (error.isNotFound || error.isValidationError)) return false;
      return failureCount < 2;
    },
  });

  const formFields = formQuery.data?.fields;
  const fields = useMemo(() => formFields ?? [], [formFields]);
  const schema = useMemo(() => buildPublicFormSchema(fields), [fields]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PublicFormValues>({
    resolver: zodResolver(schema),
    values: formQuery.data ? defaultPublicFormValues(fields) : undefined,
  });

  const submitMutation = useMutation({
    mutationFn: (values: PublicFormValues) => publicFormsApi.submit(formId, cleanPublicFormValues(fields, values)),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submitMutation.isPending) return; // guard double-submit
    setSubmitError(null);
    try {
      await submitMutation.mutateAsync(values);
    } catch (err) {
      setSubmitError(submitErrorMessage(err));
    }
  });

  if (formQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <LoadingState label="Loading form…" />
      </div>
    );
  }

  if (formQuery.isError || !formQuery.data) {
    const content = loadErrorContent(formQuery.error);
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-black/[0.08] p-8 dark:border-white/[0.12]">
          <EmptyState title={content.title} description={content.description} />
        </div>
      </div>
    );
  }

  const form = formQuery.data;

  if (submitMutation.isSuccess) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-black/[0.08] p-8 text-center dark:border-white/[0.12]">
          <Check className="mx-auto size-10 text-success" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">Thank you!</h3>
          <p className="mt-2 text-sm text-foreground/60">
            {form.thank_you_message || "Your response has been recorded."}
          </p>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-black/[0.08] p-8 dark:border-white/[0.12]">
          <EmptyState title="This form has no fields" description="There's nothing to fill in here yet." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-black/[0.08] p-6 sm:p-8 dark:border-white/[0.12]">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">{form.name}</h1>
            {form.description ? <p className="mt-2 text-base text-foreground/60">{form.description}</p> : null}
          </div>

          <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
            {fields.map((field) => (
              <PublicFormField key={field.id} field={field} control={control} />
            ))}

            {submitError ? (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {submitError}
              </p>
            ) : null}

            <Button type="submit" variant="primary" isDisabled={isSubmitting || submitMutation.isPending} className="w-full">
              {isSubmitting || submitMutation.isPending ? "Submitting…" : "Submit"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
