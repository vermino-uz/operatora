"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, Modal, TextField, type UseOverlayStateReturn } from "@heroui/react";

import { ApiError } from "@/types/api";
import { inviteMemberSchema, type InviteMemberFormValues } from "@/features/team/schema";
import { useInviteMemberMutation } from "@/features/team/hooks/useTeamMemberMutations";

function inviteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to invite teammates.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function InviteMemberModal({
  workspaceId,
  state,
}: {
  workspaceId: string;
  state: UseOverlayStateReturn;
}) {
  const invite = useInviteMemberMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", password: "", full_name: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (invite.isPending) return; // guard double-submit
    setError(null);
    try {
      await invite.mutateAsync({
        email: values.email.trim(),
        password: values.password,
        full_name: values.full_name?.trim() || undefined,
      });
      handleClose();
    } catch (err) {
      setError(inviteErrorMessage(err));
    }
  });

  /** Single close path — used by the Cancel button, the submit success
   * path, and the Modal's own dismiss (backdrop/Escape) — so form/error
   * state always resets no matter how the modal closes, not just on a
   * successful submit. */
  function handleClose() {
    reset();
    setError(null);
    state.close();
  }

  return (
    <Modal
      isOpen={state.isOpen}
      onOpenChange={(open) => {
        if (open) state.setOpen(true);
        else handleClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Invite teammate</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex flex-col gap-4">
                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Email</Label>
                      <Input type="email" placeholder="teammate@company.com" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="full_name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid}>
                      <Label>Full name</Label>
                      <Input placeholder="Optional" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="password"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Initial password</Label>
                      <Input type="password" placeholder="At least 8 characters" />
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
                <Button type="submit" variant="primary" isDisabled={isSubmitting || invite.isPending}>
                  {isSubmitting || invite.isPending ? "Inviting…" : "Send invite"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
