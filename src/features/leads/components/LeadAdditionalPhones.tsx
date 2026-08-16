"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, TextField } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useLeadPhoneMutations, useLeadPhonesQuery } from "@/features/leads/hooks/useLeadPhones";
import { leadAdditionalPhoneSchema, type LeadAdditionalPhoneFormValues } from "@/features/leads/schema";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";

/** `leads.controller.ts`'s `/leads/:id/phones` — additional labeled numbers
 * (mother, director, ...), distinct from the primary `phone_number` shown
 * above it in the Info tab. Mirrors the old frontend's
 * `LeadAdditionalPhones.tsx` (read for reference only). */
export function LeadAdditionalPhones({ leadId }: { leadId: string }) {
  const phonesQuery = useLeadPhonesQuery(leadId);
  const { add, remove } = useLeadPhoneMutations(leadId);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<LeadAdditionalPhoneFormValues>({
    resolver: zodResolver(leadAdditionalPhoneSchema),
    defaultValues: { phone_number: "", label: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (add.isPending) return;
    setError(null);
    try {
      await add.mutateAsync({ phone_number: values.phone_number, label: values.label || undefined });
      reset({ phone_number: "", label: "" });
      setShowForm(false);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  });

  if (phonesQuery.isLoading) return <LoadingState label="Loading additional numbers…" className="py-2" />;
  if (phonesQuery.isError) return <ErrorState error={phonesQuery.error} onRetry={() => phonesQuery.refetch()} />;
  const phones = phonesQuery.data ?? [];

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-foreground/50">Additional phone numbers</p>
        <button type="button" className="text-xs text-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {phones.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {phones.map((phone) => (
            <li key={phone.id} className="flex items-center justify-between gap-2">
              <span>
                <span className="font-mono">{phone.phone_number}</span>
                {phone.label ? <span className="text-foreground/50"> — {phone.label}</span> : null}
              </span>
              <button
                type="button"
                className="text-xs text-foreground/40 hover:text-danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(phone.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : !showForm ? (
        <p className="text-sm text-foreground/50">None</p>
      ) : null}

      {showForm ? (
        <form onSubmit={onSubmit} noValidate className="mt-2 flex items-end gap-2">
          <Controller
            name="phone_number"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} isInvalid={fieldState.invalid} className="flex-1">
                <Label className="sr-only">Phone number</Label>
                <Input type="tel" placeholder="+998 90 123 45 67" />
              </TextField>
            )}
          />
          <Controller
            name="label"
            control={control}
            render={({ field }) => (
              <TextField {...field} className="flex-1">
                <Label className="sr-only">Label</Label>
                <Input placeholder="e.g. Mother" />
              </TextField>
            )}
          />
          <Button type="submit" size="sm" variant="primary" isDisabled={isSubmitting || add.isPending}>
            {add.isPending ? "Adding…" : "Add"}
          </Button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
