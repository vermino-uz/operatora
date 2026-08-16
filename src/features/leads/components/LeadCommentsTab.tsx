"use client";

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Label, TextArea, TextField } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLeadCommentsQuery, useLeadCommentMutations } from "@/features/leads/hooks/useLeadComments";
import { leadCommentSchema, type LeadCommentFormValues } from "@/features/leads/schema";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";

/**
 * `leads-comments.controller.ts` — text comments + optional file/image
 * attachments (5 MB cap per upload, enforced server-side). Real create/
 * delete; edit is deliberately not wired (the backend supports `PATCH`, but
 * the old frontend's own comment edit UX is a rare, low-value affordance —
 * out of scope for this pass, delete + re-post covers the same need).
 */
export function LeadCommentsTab({ leadId, isActive }: { leadId: string; isActive: boolean }) {
  const commentsQuery = useLeadCommentsQuery(leadId, isActive);
  const { create, remove, upload } = useLeadCommentMutations(leadId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<LeadCommentFormValues>({
    resolver: zodResolver(leadCommentSchema),
    defaultValues: { content: "", imageUrls: [] },
  });

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("That file is too large (max 5 MB).");
      return;
    }
    setUploadError(null);
    try {
      const { publicUrl } = await upload.mutateAsync(file);
      setPendingFiles((prev) => [...prev, { name: file.name, url: publicUrl }]);
    } catch (err) {
      setUploadError(leadActionErrorMessage(err));
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (create.isPending) return; // guard double-submit
    setSubmitError(null);
    try {
      await create.mutateAsync({ content: values.content, imageUrls: pendingFiles.map((f) => f.url) });
      reset({ content: "", imageUrls: [] });
      setPendingFiles([]);
    } catch (err) {
      setSubmitError(leadActionErrorMessage(err));
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
        <Controller
          name="content"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid} className="w-full">
              <Label className="sr-only">Comment</Label>
              <TextArea rows={3} placeholder="Write a comment…" />
            </TextField>
          )}
        />
        {pendingFiles.length > 0 ? (
          <ul className="flex flex-wrap gap-2 text-xs">
            {pendingFiles.map((f, i) => (
              <li key={f.url} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                {f.name}
                <button
                  type="button"
                  className="text-foreground/50 hover:text-danger"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Remove ${f.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {uploadError ? <p className="text-xs text-danger">{uploadError}</p> : null}
        {submitError ? (
          <p role="alert" className="text-sm text-danger">
            {submitError}
          </p>
        ) : null}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            isDisabled={upload.isPending}
            onPress={() => fileInputRef.current?.click()}
          >
            {upload.isPending ? "Uploading…" : "Attach file"}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
          <Button type="submit" size="sm" variant="primary" isDisabled={isSubmitting || create.isPending}>
            {isSubmitting || create.isPending ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </form>

      {commentsQuery.isLoading ? <LoadingState label="Loading comments…" /> : null}
      {commentsQuery.isError ? <ErrorState error={commentsQuery.error} onRetry={() => commentsQuery.refetch()} /> : null}
      {commentsQuery.data && commentsQuery.data.length === 0 ? (
        <EmptyState title="No comments yet" description="Be the first to leave a note on this lead." />
      ) : null}

      <ul className="flex flex-col gap-3">
        {(commentsQuery.data ?? []).map((comment) => (
          <li key={comment.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">
                {comment.profile?.full_name || comment.profile?.email || "Unknown"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground/40">{new Date(comment.created_at).toLocaleString()}</span>
                <button
                  type="button"
                  className="text-xs text-foreground/40 hover:text-danger"
                  onClick={() => remove.mutate(comment.id)}
                  disabled={remove.isPending}
                >
                  Delete
                </button>
              </div>
            </div>
            {comment.content ? <p className="whitespace-pre-wrap text-foreground/80">{comment.content}</p> : null}
            {comment.images && comment.images.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {comment.images.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                      Attachment
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
