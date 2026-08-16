"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Chip, FieldError, Label, Modal, TextArea, TextField } from "@heroui/react";
import { ArrowRotateRight, Copy } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { smsTemplateSubmitSchema, type SmsTemplateSubmitFormValues } from "@/features/leads/schema";
import {
  isAccountMissing,
  useEskizAccountQuery,
  useEskizTemplatesQuery,
  useResubmitEskizTemplateMutation,
  useSubmitEskizTemplateMutation,
  useSyncEskizTemplatesMutation,
} from "@/features/leads/hooks/useEskizSms";
import type { EskizTemplate, EskizTemplateStatus } from "@/features/leads/types";

function statusColor(status: EskizTemplateStatus): "success" | "danger" | "warning" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

function templateErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return error.message || "You don't have permission to do that.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Something went wrong. Please try again.";
}

/**
 * SMS templates manager (Phase 2c-8) — real contract: `GET/POST
 * /eskiz/templates` + `POST /eskiz/templates/:id/resubmit` (see
 * `services/api/eskizSms.ts`'s header comment for why this, not the old
 * frontend's `lead_sms_templates`). Each submitted template goes through
 * Eskiz's own provider-side moderation (`moderation` → `approved` |
 * `rejected`), which can take real time — this manager can't approve a
 * template itself, only submit/resubmit/refresh status.
 *
 * Explicitly NOT built here (dropped, not fabricated) because the real
 * table backing this has no such columns: **no name field** (templates are
 * identified by their content, matching the list UI below), **no language
 * filter** (Eskiz templates carry no language tag), **no reason-tag /
 * rejection-reason association** (confirmed against the real schema — not
 * the same relationship the brief's literal wording assumed). "Copy as new"
 * is real (prefills the submit box with an existing template's content) —
 * there's no update endpoint, a template's approved text is immutable once
 * submitted.
 */
export function SmsTemplatesManager({ onClose }: { onClose: () => void }) {
  const accountQuery = useEskizAccountQuery(true);
  const templatesQuery = useEskizTemplatesQuery(Boolean(accountQuery.data));
  const submitTemplate = useSubmitEskizTemplateMutation();
  const resubmitTemplate = useResubmitEskizTemplateMutation();
  const syncTemplates = useSyncEskizTemplatesMutation();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SmsTemplateSubmitFormValues>({
    resolver: zodResolver(smsTemplateSubmitSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submitTemplate.isPending) return; // guard double-submit
    setError(null);
    try {
      await submitTemplate.mutateAsync(values.content.trim());
      reset();
      setShowForm(false);
    } catch (err) {
      setError(templateErrorMessage(err));
    }
  });

  function handleCopyAsNew(template: EskizTemplate) {
    setValue("content", template.content);
    setShowForm(true);
  }

  function handleResubmit(id: string) {
    if (resubmitTemplate.isPending) return; // guard double-submit
    setError(null);
    resubmitTemplate.mutate(id, { onError: (err) => setError(templateErrorMessage(err)) });
  }

  const accountMissing = accountQuery.isError && isAccountMissing(accountQuery.error);
  const templates = templatesQuery.data ?? [];

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>SMS templates</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              {accountQuery.isLoading ? <LoadingState label="Checking SMS gateway…" /> : null}

              {accountMissing ? (
                <EmptyState
                  title="SMS gateway not connected"
                  description="Connect a workspace Eskiz account in Settings → Eskiz before creating or sending SMS templates."
                  action={
                    <Link
                      href="/settings?section=eskiz"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-black/[0.03] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
                    >
                      Go to Settings
                    </Link>
                  }
                />
              ) : null}

              {!accountQuery.isLoading && !accountMissing ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-foreground/60">
                      Templates are moderated by the SMS provider before they can be sent — submitting one starts that review.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      isDisabled={syncTemplates.isPending}
                      onPress={() => syncTemplates.mutate()}
                    >
                      <ArrowRotateRight className="size-4" aria-hidden="true" />
                      {syncTemplates.isPending ? "Refreshing…" : "Refresh statuses"}
                    </Button>
                  </div>

                  {templatesQuery.isLoading ? (
                    <LoadingState label="Loading templates…" />
                  ) : templatesQuery.isError ? (
                    <p className="text-sm text-danger">{templateErrorMessage(templatesQuery.error)}</p>
                  ) : templates.length === 0 ? (
                    <EmptyState title="No templates yet" description="Submit your first SMS template below." />
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {templates.map((tpl) => (
                        <li
                          key={tpl.id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="whitespace-pre-wrap text-sm text-foreground">{tpl.content}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Chip size="sm" color={statusColor(tpl.status)} variant="soft" className="capitalize">
                                {tpl.status}
                              </Chip>
                              <span className="text-xs text-foreground/40">
                                {new Date(tpl.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              aria-label="Copy as new template"
                              onPress={() => handleCopyAsNew(tpl)}
                            >
                              <Copy className="size-3.5" aria-hidden="true" />
                            </Button>
                            {tpl.status === "rejected" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                isDisabled={resubmitTemplate.isPending}
                                onPress={() => handleResubmit(tpl.id)}
                              >
                                Resubmit
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {showForm ? (
                    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
                      <TextField isInvalid={Boolean(errors.content)}>
                        <Label>New template text</Label>
                        <TextArea rows={3} placeholder="Hurmatli mijoz, buyurtmangiz qabul qilindi." {...register("content")} />
                        <FieldError>{errors.content?.message}</FieldError>
                      </TextField>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onPress={() => {
                            reset();
                            setShowForm(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" isDisabled={isSubmitting || submitTemplate.isPending}>
                          {submitTemplate.isPending ? "Submitting…" : "Submit for approval"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button variant="secondary" onPress={() => setShowForm(true)}>
                      New template
                    </Button>
                  )}
                </>
              ) : null}

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
