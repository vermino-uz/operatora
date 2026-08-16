"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, ListBox, Modal, Select, TextArea, TextField } from "@heroui/react";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { composeSmsSchema, type ComposeSmsFormValues } from "@/features/leads/schema";
import {
  isAccountMissing,
  useEskizAccountQuery,
  useEskizGuidanceQuery,
  useEskizTemplatesQuery,
  useSendEskizSmsMutation,
} from "@/features/leads/hooks/useEskizSms";
import { SMS_OVERRIDE_VARIABLES, formatLeadName, resolveSmsVariables, type LeadRow } from "@/features/leads/types";

function composeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return error.message || "SMS isn't included on this workspace's plan.";
    if (error.isValidationError) return error.message;
    if (error.isNotFound) return error.message || "Template not found.";
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Something went wrong. Please try again.";
}

/**
 * Per-lead compose (Phase 2c-8) — `POST /eskiz/send`, see
 * `services/api/eskizSms.ts`'s header comment for the real contract this is
 * built on. Only `approved` templates are offered (Eskiz refuses anything
 * else server-side). The optional text override is a free-text field with
 * "insert variable" convenience buttons using the old frontend's confirmed
 * variable set — a client-side substitution preview only; Eskiz still
 * validates the final text structurally matches the approved template and
 * will reject the send otherwise (surfaced as a normal error below, not
 * silently swallowed).
 */
export function ComposeSmsDialog({ lead, operatorName, onClose }: { lead: LeadRow; operatorName: string; onClose: () => void }) {
  const accountQuery = useEskizAccountQuery(true);
  const guidanceQuery = useEskizGuidanceQuery(Boolean(accountQuery.data));
  const templatesQuery = useEskizTemplatesQuery(Boolean(accountQuery.data));
  const sendSms = useSendEskizSmsMutation(lead.id);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<ComposeSmsFormValues>({
    resolver: zodResolver(composeSmsSchema),
    defaultValues: { phone: lead.phone_number ?? "", template_id: "", text: "" },
  });
  const templateId = useWatch({ control, name: "template_id" });
  const textOverride = useWatch({ control, name: "text" });
  const phone = useWatch({ control, name: "phone" });

  const approvedTemplates = useMemo(() => (templatesQuery.data ?? []).filter((t) => t.status === "approved"), [templatesQuery.data]);
  const selectedTemplate = approvedTemplates.find((t) => t.id === templateId) ?? null;

  const previewSource = textOverride?.trim() ? textOverride : selectedTemplate?.content ?? "";
  const preview = resolveSmsVariables(previewSource, {
    lead_first_name: lead.first_name ?? "",
    lead_last_name: lead.last_name ?? "",
    lead_phone: lead.phone_number ?? "",
    operator_name: operatorName,
    company_name: "Operatora",
  });

  const price = guidanceQuery.data?.sms_price_uzs ?? null;
  const balance = accountQuery.data?.balance_uzs ?? null;
  const insufficient = price !== null && balance !== null && balance < price;

  function insertVariable(token: string) {
    setValue("text", `${textOverride ?? selectedTemplate?.content ?? ""}${token}`, { shouldDirty: true });
  }

  const onSubmit = handleSubmit(async (values) => {
    if (sendSms.isPending) return; // guard double-submit
    setError(null);
    try {
      const resolvedText = values.text?.trim() ? preview : undefined;
      await sendSms.mutateAsync({ phone: values.phone.trim(), template_id: values.template_id, text: resolvedText });
      setSent(true);
    } catch (err) {
      setError(composeErrorMessage(err));
    }
  });

  const accountMissing = accountQuery.isError && isAccountMissing(accountQuery.error);

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Send SMS to {formatLeadName(lead)}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              {accountQuery.isLoading ? <LoadingState label="Checking SMS gateway…" /> : null}

              {accountMissing ? (
                <EmptyState
                  title="SMS gateway not connected"
                  description="Connect a workspace Eskiz account in Settings → Eskiz before sending SMS."
                />
              ) : null}

              {sent ? (
                <EmptyState title="SMS sent" description="The message is queued with the gateway. Delivery status will update in this lead's SMS tab." />
              ) : !accountQuery.isLoading && !accountMissing ? (
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                        <Label>Phone number</Label>
                        <Input placeholder="+998901234567" />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </TextField>
                    )}
                  />

                  <Controller
                    name="template_id"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <Label>Template</Label>
                        <Select
                          aria-label="Template"
                          value={field.value || undefined}
                          placeholder={approvedTemplates.length ? "Choose an approved template…" : "No approved templates"}
                          onChange={(key) => typeof key === "string" && field.onChange(key)}
                          isDisabled={templatesQuery.isLoading || approvedTemplates.length === 0}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox
                              items={approvedTemplates.map((t) => ({
                                id: t.id,
                                label: t.content.length > 60 ? `${t.content.slice(0, 60)}…` : t.content,
                              }))}
                            >
                              {(opt) => (
                                <ListBox.Item id={opt.id} textValue={opt.label}>
                                  {opt.label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              )}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        {fieldState.error ? <FieldError>{fieldState.error.message}</FieldError> : null}
                        {approvedTemplates.length === 0 && !templatesQuery.isLoading ? (
                          <p className="mt-1 text-xs text-foreground/50">
                            No approved templates yet — submit one via SMS templates and wait for provider approval.
                          </p>
                        ) : null}
                      </div>
                    )}
                  />

                  <Controller
                    name="text"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField {...field} isInvalid={fieldState.invalid}>
                        <Label>Override text (optional)</Label>
                        <TextArea rows={3} placeholder="Leave blank to send the template as-is" />
                        <FieldError>{fieldState.error?.message}</FieldError>
                        <p className="mt-1 text-xs text-foreground/50">
                          Must keep the approved template&apos;s structure — Eskiz rejects a send that changes it too much.
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {SMS_OVERRIDE_VARIABLES.map((v) => (
                            <button
                              key={v.token}
                              type="button"
                              onClick={() => insertVariable(v.token)}
                              className="rounded border border-black/[0.08] px-1.5 py-0.5 text-[11px] text-foreground/60 hover:bg-black/[0.03] dark:border-white/[0.12] dark:hover:bg-white/[0.05]"
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </TextField>
                    )}
                  />

                  {preview ? (
                    <div className="rounded-lg border border-black/[0.08] bg-[var(--default)] p-3 text-sm dark:border-white/[0.12]">
                      <p className="mb-1 text-xs font-medium text-foreground/50">Preview</p>
                      <p className="whitespace-pre-wrap text-foreground">{preview}</p>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between rounded-lg border border-black/[0.08] px-3 py-2 text-xs dark:border-white/[0.12]">
                    <span className="text-foreground/60">Estimated cost</span>
                    <span className={insufficient ? "font-semibold text-danger" : "font-semibold text-foreground"}>
                      {price !== null ? `${price.toLocaleString("ru-RU")} UZS` : "—"}
                      {balance !== null ? ` · balance ${balance.toLocaleString("ru-RU")} UZS` : ""}
                    </span>
                  </div>
                  {insufficient ? <p className="text-xs text-danger">Balance too low to send — top up in Settings → Eskiz.</p> : null}

                  {error ? (
                    <p role="alert" className="text-sm text-danger">
                      {error}
                    </p>
                  ) : null}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onPress={onClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isDisabled={isSubmitting || sendSms.isPending || !templateId || !phone.trim() || insufficient}
                    >
                      {sendSms.isPending ? "Sending…" : "Send SMS"}
                    </Button>
                  </div>
                </form>
              ) : null}
            </Modal.Body>
            {sent ? (
              <Modal.Footer>
                <Button variant="primary" onPress={onClose}>
                  Done
                </Button>
              </Modal.Footer>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
