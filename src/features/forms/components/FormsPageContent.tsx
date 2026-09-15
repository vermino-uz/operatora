"use client";

import { useState } from "react";
import { Button, useOverlayState } from "@heroui/react";
import { Plus, Copy, ArrowUpRightFromSquare, TrashBin, Eye, Pencil, FileText } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError } from "@/types/api";
import { canEditForms } from "@/features/forms/permissions";
import {
  useDeleteFormsMutation,
  useFormsQuery,
  useFormSubmissionCountsQuery,
} from "@/features/forms/hooks/useForms";
import { FormEditorModal } from "@/features/forms/components/FormEditorModal";
import { FormSubmissionsDialog } from "@/features/forms/components/FormSubmissionsDialog";
import type { FormRow } from "@/features/forms/types";

function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to delete forms.";
    return error.message;
  }
  return "Couldn't delete the selected form(s).";
}

function publicFormUrl(formId: string): string {
  if (typeof window === "undefined") return `/form/${formId}`;
  return `${window.location.origin}/form/${formId}`;
}

/**
 * `/forms` — the form BUILDER. Reference: old frontend's `pages/Forms.tsx`
 * + `components/forms/{CreateFormDialog,EditFormDialog,FormSubmissionsDialog}.tsx`.
 * CRUD goes through the db-proxy (`services/api/forms.ts` — no dedicated
 * REST controller for this table, confirmed by grepping the backend).
 * Submitting the resulting public link (`/form/[formId]`, built in Phase
 * 2e) is a confirmed backend gap — see `publicFormTypes.ts`.
 */
export function FormsPageContent() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const roles = useSessionStore((s) => s.roles);
  const user = useSessionStore((s) => s.user);
  const canEdit = canEditForms(roles);

  const formsQuery = useFormsQuery(workspaceId);
  const forms = formsQuery.data ?? [];
  const countsQuery = useFormSubmissionCountsQuery(workspaceId, forms);
  const deleteMutation = useDeleteFormsMutation(workspaceId);

  const editorState = useOverlayState();
  const submissionsState = useOverlayState();
  const [editing, setEditing] = useState<FormRow | null>(null);
  const [viewing, setViewing] = useState<FormRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    editorState.open();
  }
  function openEdit(form: FormRow) {
    setEditing(form);
    editorState.open();
  }
  function openSubmissions(form: FormRow) {
    setViewing(form);
    submissionsState.open();
  }

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function copyUrl(formId: string) {
    const url = publicFormUrl(formId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(formId);
      setTimeout(() => setCopiedId((prev) => (prev === formId ? null : prev)), 1500);
    } catch {
      // clipboard permission denied — no-op, user can still see/copy the URL manually via "Open".
    }
  }

  async function deleteSelected() {
    if (deleteMutation.isPending || selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} form(s)? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(selected);
      setSelected([]);
    } catch (err) {
      setDeleteError(deleteErrorMessage(err));
    }
  }

  async function deleteOne(form: FormRow) {
    if (deleteMutation.isPending) return;
    if (!window.confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync([form.id]);
      setSelected((prev) => prev.filter((id) => id !== form.id));
    } catch (err) {
      setDeleteError(deleteErrorMessage(err));
    }
  }

  async function clearAll() {
    if (deleteMutation.isPending || forms.length === 0) return;
    if (!window.confirm(`Delete all ${forms.length} forms? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(forms.map((f) => f.id));
      setSelected([]);
    } catch (err) {
      setDeleteError(deleteErrorMessage(err));
    }
  }

  if (!workspaceId) {
    return (
      <div className="p-6">
        <ErrorState error={new Error("No workspace selected")} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Forms</h1>
          <p className="text-sm text-foreground/60">Build shareable forms and review their submissions.</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {selected.length > 0 ? (
              <Button size="sm" variant="danger" isDisabled={deleteMutation.isPending} onPress={() => void deleteSelected()}>
                <TrashBin className="size-3.5" />
                Delete {selected.length} selected
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" isDisabled={forms.length === 0 || deleteMutation.isPending} onPress={() => void clearAll()}>
              <TrashBin className="size-3.5" />
              Clear all
            </Button>
            <Button size="sm" variant="primary" onPress={openCreate}>
              <Plus className="size-3.5" />
              New form
            </Button>
          </div>
        ) : null}
      </div>

      {deleteError ? (
        <p role="alert" className="text-sm text-danger">
          {deleteError}
        </p>
      ) : null}

      {formsQuery.isLoading ? (
        <LoadingState label="Loading forms…" className="py-16" />
      ) : formsQuery.isError ? (
        <ErrorState error={formsQuery.error} onRetry={() => formsQuery.refetch()} className="py-16" />
      ) : forms.length === 0 ? (
        <EmptyState
          title="No forms yet"
          description="Create a form to collect submissions through a shareable public link."
          action={
            canEdit ? (
              <Button size="sm" className="mt-2" onPress={openCreate}>
                Create your first form
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => {
            const count = countsQuery.data?.[form.id] ?? 0;
            const isSelected = selected.includes(form.id);
            return (
              <div key={form.id} className="flex flex-col gap-3 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
                <div className="flex items-start gap-2">
                  {canEdit ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(form.id)}
                      aria-label={`Select ${form.name}`}
                      className="mt-1 size-4 shrink-0 rounded-md accent-primary"
                    />
                  ) : null}
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{form.name}</p>
                    {form.description ? <p className="mt-0.5 text-sm text-foreground/60">{form.description}</p> : null}
                  </div>
                  <FileText className="size-4 shrink-0 text-foreground/40" aria-hidden="true" />
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      form.status === "published" ? "bg-success/15 text-success" : "bg-foreground/10 text-foreground/70"
                    }`}
                  >
                    {form.status === "published" ? "Published" : "Draft"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      form.type === "leads" ? "bg-danger/15 text-danger" : "bg-foreground/10 text-foreground/70"
                    }`}
                  >
                    {form.type === "leads" ? "Leads" : "General"}
                  </span>
                </div>

                <div className="text-xs text-foreground/60">
                  <p>{form.fields.length} field{form.fields.length === 1 ? "" : "s"}</p>
                  <p>{count} submission{count === 1 ? "" : "s"}</p>
                  <p>Created {new Date(form.created_at).toLocaleDateString()}</p>
                </div>

                <div className="truncate rounded-lg bg-foreground/5 px-2 py-1.5 font-mono text-[11px] text-foreground/60">
                  {publicFormUrl(form.id)}
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onPress={() => openSubmissions(form)}>
                    <Eye className="size-3.5" />
                    Submissions
                  </Button>
                  <Button size="sm" variant="secondary" onPress={() => void copyUrl(form.id)}>
                    <Copy className="size-3.5" />
                    {copiedId === form.id ? "Copied" : "Copy link"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => window.open(publicFormUrl(form.id), "_blank", "noreferrer")}
                    aria-label="Open public form"
                  >
                    <ArrowUpRightFromSquare className="size-3.5" />
                  </Button>
                  {canEdit ? (
                    <>
                      <Button size="sm" variant="ghost" onPress={() => openEdit(form)} aria-label="Edit form">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => void deleteOne(form)} aria-label="Delete form">
                        <TrashBin className="size-3.5" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canEdit ? (
        <FormEditorModal workspaceId={workspaceId} createdBy={user?.email ?? user?.id ?? null} state={editorState} editing={editing} />
      ) : null}
      <FormSubmissionsDialog state={submissionsState} form={viewing} />
    </div>
  );
}
