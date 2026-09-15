"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, ListBox, Modal, Select, TextField, type UseOverlayStateReturn } from "@heroui/react";
import { PersonPlus, Plus, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { FieldError } from "@/features/finance/components/RhfFieldError";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { groupMemberEditorSchema, newClientSchema, type GroupMemberEditorValues, type NewClientValues } from "@/features/finance/schema";
import {
  useAddGroupMemberMutation,
  useClientsQuery,
  useCreateClientMutation,
  useGroupUsersQuery,
  useRemoveGroupMemberMutation,
} from "@/features/finance/hooks/useFinance";
import { formatUZS } from "@/features/finance/utils";
import type { GroupRow } from "@/features/finance/types";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage group members.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return fallback;
}

/**
 * Group membership management, scoped down from the old `GroupsTab.tsx`'s
 * combined member/month/payment view (2000+ lines: month planner grid,
 * inline client CRUD, per-member payment recording all in one modal).
 * Deliberately split here: this modal only handles roster (add/remove
 * members + monthly-amount override), matching the real `group_users`
 * table's columns; recording an actual payment happens in the Payments tab
 * against a chosen member instead of inline here, same separation of
 * concerns the Payments tab already needs for its own member picker.
 */
export function GroupMembersModal({
  workspaceId,
  group,
  canManage,
  state,
}: {
  workspaceId: string;
  group: GroupRow | null;
  canManage: boolean;
  state: UseOverlayStateReturn;
}) {
  const groupIds = group ? [group.id] : [];
  const membersQuery = useGroupUsersQuery(groupIds);
  const clientsQuery = useClientsQuery(workspaceId);
  const addMutation = useAddGroupMemberMutation(groupIds);
  const removeMutation = useRemoveGroupMemberMutation(groupIds);
  const createClientMutation = useCreateClientMutation(workspaceId);

  const [showNewClient, setShowNewClient] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    control: memberControl,
    handleSubmit: handleMemberSubmit,
    reset: resetMemberForm,
  } = useForm<GroupMemberEditorValues>({
    resolver: zodResolver(groupMemberEditorSchema),
    defaultValues: { client_id: "", monthly_amount_override: "" },
  });

  const {
    control: clientControl,
    handleSubmit: handleClientSubmit,
    reset: resetClientForm,
    formState: { isSubmitting: isCreatingClient },
  } = useForm<NewClientValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: { full_name: "", phone: "", email: "" },
  });

  const clients = clientsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  async function addMember(values: GroupMemberEditorValues) {
    if (!group || addMutation.isPending) return;
    setActionError(null);
    try {
      const override = values.monthly_amount_override ? Number(values.monthly_amount_override) : null;
      await addMutation.mutateAsync({
        group_id: group.id,
        client_id: values.client_id,
        status: "active",
        monthly_amount_override: override && !Number.isNaN(override) ? override : null,
      });
      resetMemberForm({ client_id: "", monthly_amount_override: "" });
    } catch (err) {
      setActionError(errorMessage(err, "Couldn't add this member."));
    }
  }

  async function createClient(values: NewClientValues) {
    if (createClientMutation.isPending) return;
    setActionError(null);
    try {
      await createClientMutation.mutateAsync({
        full_name: values.full_name,
        phone: values.phone || null,
        email: values.email || null,
        notes: null,
        created_by: null,
      });
      resetClientForm({ full_name: "", phone: "", email: "" });
      setShowNewClient(false);
    } catch (err) {
      setActionError(errorMessage(err, "Couldn't create this client."));
    }
  }

  async function removeMember(id: string) {
    if (removeMutation.isPending) return;
    if (!window.confirm("Remove this member from the group?")) return;
    setActionError(null);
    try {
      await removeMutation.mutateAsync(id);
    } catch (err) {
      setActionError(errorMessage(err, "Couldn't remove this member."));
    }
  }

  const clientOptions = clients
    .filter((c) => !members.some((m) => m.client_id === c.id))
    .map((c) => ({ id: c.id, label: c.phone ? `${c.full_name} (${c.phone})` : c.full_name }));

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : state.close())}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{group ? `Members — ${group.name}` : "Members"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
              {actionError ? (
                <p role="alert" className="text-sm text-danger">
                  {actionError}
                </p>
              ) : null}

              {membersQuery.isLoading ? (
                <LoadingState label="Loading members…" />
              ) : members.length === 0 ? (
                <EmptyState title="No members yet" description="Add a client below to enroll them in this group." />
              ) : (
                <div className="overflow-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-divider">
                        <th className="whitespace-nowrap px-2 py-1.5 text-xs font-medium text-muted">Client</th>
                        <th className="whitespace-nowrap px-2 py-1.5 text-xs font-medium text-muted">Status</th>
                        <th className="whitespace-nowrap px-2 py-1.5 text-xs font-medium text-muted">Monthly override</th>
                        {canManage ? <th className="whitespace-nowrap px-2 py-1.5 text-xs font-medium text-muted">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => {
                        const client = member.client_id ? clientById.get(member.client_id) : undefined;
                        return (
                          <tr key={member.id} className="border-b border-divider/60">
                            <td className="px-2 py-2 align-top text-sm text-foreground">
                              {client?.full_name ?? "Unknown client"}
                              {client?.phone ? <p className="font-mono text-xs text-foreground/60">{client.phone}</p> : null}
                            </td>
                            <td className="px-2 py-2 align-top text-sm text-foreground">{member.status}</td>
                            <td className="px-2 py-2 align-top text-sm text-foreground">
                              {member.monthly_amount_override != null ? formatUZS(member.monthly_amount_override) : "—"}
                            </td>
                            {canManage ? (
                              <td className="px-2 py-2 align-top">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  isDisabled={removeMutation.isPending}
                                  onPress={() => void removeMember(member.id)}
                                  aria-label="Remove member"
                                >
                                  <TrashBin className="size-3.5" />
                                </Button>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {canManage ? (
                <div className="rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
                  <p className="mb-2 text-sm font-medium text-foreground">Add member</p>
                  <form
                    onSubmit={handleMemberSubmit(addMember)}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <Controller
                      name="client_id"
                      control={memberControl}
                      render={({ field, fieldState }) => (
                        <div className="min-w-[220px] flex-1">
                          {clientOptions.length === 0 ? (
                            <p className="text-xs text-foreground/60">No available clients — add a new client below.</p>
                          ) : (
                            <Select
                              aria-label="Client"
                              placeholder="Choose a client"
                              value={field.value}
                              onChange={(key) => typeof key === "string" && field.onChange(key)}
                              className="w-full"
                              isInvalid={fieldState.invalid}
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox items={clientOptions}>
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
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </div>
                      )}
                    />
                    <Controller
                      name="monthly_amount_override"
                      control={memberControl}
                      render={({ field }) => (
                        <TextField {...field} className="w-40">
                          <Input inputMode="numeric" placeholder="Override (UZS)" />
                        </TextField>
                      )}
                    />
                    <Button type="submit" size="sm" variant="secondary" isDisabled={addMutation.isPending || clientOptions.length === 0}>
                      <PersonPlus className="size-3.5" />
                      Add
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onPress={() => setShowNewClient((v) => !v)}>
                      <Plus className="size-3.5" />
                      New client
                    </Button>
                  </form>

                  {showNewClient ? (
                    <form onSubmit={handleClientSubmit(createClient)} className="mt-3 flex flex-wrap items-end gap-2 border-t border-divider pt-3">
                      <Controller
                        name="full_name"
                        control={clientControl}
                        render={({ field, fieldState }) => (
                          <TextField {...field} isInvalid={fieldState.invalid} className="min-w-[160px] flex-1">
                            <Label>Full name</Label>
                            <Input placeholder="Client name" />
                            <FieldError>{fieldState.error?.message}</FieldError>
                          </TextField>
                        )}
                      />
                      <Controller
                        name="phone"
                        control={clientControl}
                        render={({ field }) => (
                          <TextField {...field} className="min-w-[140px]">
                            <Label>Phone</Label>
                            <Input placeholder="+998901234567" />
                          </TextField>
                        )}
                      />
                      <Controller
                        name="email"
                        control={clientControl}
                        render={({ field, fieldState }) => (
                          <TextField {...field} isInvalid={fieldState.invalid} className="min-w-[160px]">
                            <Label>Email</Label>
                            <Input placeholder="Optional" />
                            <FieldError>{fieldState.error?.message}</FieldError>
                          </TextField>
                        )}
                      />
                      <Button type="submit" size="sm" variant="primary" isDisabled={isCreatingClient || createClientMutation.isPending}>
                        Create client
                      </Button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={() => state.close()}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
