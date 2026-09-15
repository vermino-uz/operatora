"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, Modal, TextField, useOverlayState, type UseOverlayStateReturn } from "@heroui/react";
import { Link, Plus, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { quickLinkSchema, type QuickLinkFormValues } from "@/features/instructions/schema";
import {
  useCreateQuickLinkMutation,
  useDeleteQuickLinkMutation,
  useQuickLinksQuery,
} from "@/features/instructions/hooks/useInstructions";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage quick links.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Couldn't save this link. Please try again.";
}

function AddQuickLinkModal({
  workspaceId,
  nextDisplayOrder,
  state,
}: {
  workspaceId: string;
  nextDisplayOrder: number;
  state: UseOverlayStateReturn;
}) {
  const createMutation = useCreateQuickLinkMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<QuickLinkFormValues>({
    resolver: zodResolver(quickLinkSchema),
    defaultValues: { title: "", url: "" },
  });

  function handleClose() {
    reset();
    setError(null);
    state.close();
  }

  const onSubmit = handleSubmit(async (values) => {
    if (createMutation.isPending) return; // guard double-submit
    setError(null);
    try {
      await createMutation.mutateAsync({ input: values, displayOrder: nextDisplayOrder });
      handleClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : handleClose())}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>New quick link</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex flex-col gap-4">
                <Controller
                  name="title"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Title</Label>
                      <Input placeholder="CRM knowledge base" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="url"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>URL</Label>
                      <Input placeholder="https://…" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                {error ? (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isDisabled={isSubmitting || createMutation.isPending}>
                  {createMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/** Quick Links — old page's "Quick Links" tab (`QuickLinksManager.tsx`),
 * reads/writes the `quick_links` table via the same db-proxy escape hatch
 * (`{ scope: 'workspace', writeRoles: MANAGER_ROLES }`). */
export function QuickLinksPanel({ workspaceId, canEdit }: { workspaceId: string; canEdit: boolean }) {
  const linksQuery = useQuickLinksQuery(workspaceId);
  const deleteMutation = useDeleteQuickLinkMutation(workspaceId);
  const modalState = useOverlayState();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function remove(id: string, title: string) {
    if (deleteMutation.isPending) return; // guard double-submit
    if (!window.confirm(`Delete "${title}"?`)) return;
    setDeleteError(null);
    setPendingDeleteId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setPendingDeleteId(null);
    }
  }

  if (linksQuery.isLoading) return <LoadingState label="Loading quick links…" className="py-12" />;
  if (linksQuery.isError) return <ErrorState error={linksQuery.error} onRetry={() => linksQuery.refetch()} className="py-12" />;

  const links = linksQuery.data ?? [];

  return (
    <div>
      {canEdit ? (
        <div className="mb-3 flex justify-end">
          <Button size="sm" onPress={() => modalState.open()}>
            <Plus className="size-3.5" />
            Add link
          </Button>
        </div>
      ) : null}

      {deleteError ? (
        <p role="alert" className="mb-3 text-sm text-danger">
          {deleteError}
        </p>
      ) : null}

      {links.length === 0 ? (
        <EmptyState title="No quick links yet" description="Add shortcuts to docs, CRM pages, or other resources." />
      ) : (
        <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.12]">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-3 px-4 py-3">
              <Link className="size-4 shrink-0 text-foreground/40" />
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 flex-1 truncate text-sm font-medium text-primary hover:underline"
              >
                {link.title}
              </a>
              {canEdit ? (
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Delete"
                  isDisabled={pendingDeleteId === link.id}
                  onPress={() => void remove(link.id, link.title)}
                >
                  <TrashBin className="size-4 text-danger" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AddQuickLinkModal workspaceId={workspaceId} nextDisplayOrder={links.length} state={modalState} />
    </div>
  );
}
