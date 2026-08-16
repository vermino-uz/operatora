"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Tabs,
  TextField,
  type UseOverlayStateReturn,
} from "@heroui/react";
import { Eye, EyeSlash } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useSessionStore } from "@/state/session-store";
import { editMemberSchema, type EditMemberFormValues } from "@/features/team/schema";
import { useUpdateMemberMutation, useRemoveMemberMutation } from "@/features/team/hooks/useTeamMemberMutations";
import type { TeamMemberRow } from "@/features/team/types";
import { useWorkspaceRolesQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import { useUserRolesQuery } from "@/features/roles/hooks/useUserRolesQuery";
import { useSetUserRolesMutation } from "@/features/roles/hooks/useRoleMutations";
import { DeleteMemberConfirm } from "@/features/team/components/DeleteMemberConfirm";
import { SipAccountsPanel } from "@/features/team/components/sip/SipAccountsPanel";
import { GsmLinesPanel } from "@/features/team/components/sip/GsmLinesPanel";
import { SmsGatewayPanel } from "@/features/team/components/sip/SmsGatewayPanel";

export type EditMemberTab = "profile" | "role" | "sip";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage this member.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function EditMemberModal({
  workspaceId,
  member,
  state,
  initialTab = "profile",
  onRemoved,
}: {
  workspaceId: string;
  member: TeamMemberRow | null;
  state: UseOverlayStateReturn;
  initialTab?: EditMemberTab;
  onRemoved?: () => void;
}) {
  const currentUserId = useSessionStore((s) => s.user?.id);
  const update = useUpdateMemberMutation(workspaceId);
  const remove = useRemoveMemberMutation(workspaceId);
  const rolesQuery = useWorkspaceRolesQuery(workspaceId);
  const userRolesQuery = useUserRolesQuery(workspaceId, member?.user_id ?? null);
  const setUserRoles = useSetUserRolesMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Render-time "adjust state on prop change" (same pattern used by
  // `useConversationAudio`) instead of a `useEffect` — resets the active
  // tab to `initialTab` every time the modal opens for a (possibly new)
  // member, without an extra render pass or a set-state-in-effect lint
  // violation.
  const [tab, setTab] = useState<EditMemberTab>(initialTab);
  const openKey = state.isOpen && member ? `${member.user_id}:${initialTab}` : null;
  const [trackedOpenKey, setTrackedOpenKey] = useState<string | null>(null);
  if (openKey && openKey !== trackedOpenKey) {
    setTrackedOpenKey(openKey);
    setTab(initialTab);
  }

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
    values: member
      ? {
          full_name: member.full_name ?? "",
          phone: member.phone ?? "",
          status: member.status,
          password: "",
          role_id: userRolesQuery.data?.role_ids?.[0] ?? "",
        }
      : undefined,
  });

  if (!member) return null;

  const isSelf = currentUserId === member.user_id;
  const roleOptions = (rolesQuery.data ?? []).map((r) => ({ id: r.id, label: r.name }));

  const onSubmit = handleSubmit(async (values) => {
    if (update.isPending || setUserRoles.isPending) return; // guard double-submit
    setError(null);
    try {
      if (tab === "profile") {
        await update.mutateAsync({
          userId: member.user_id,
          input: {
            full_name: values.full_name || undefined,
            phone: values.phone || undefined,
            status: values.status,
            password: values.password || undefined,
          },
        });
      } else if (tab === "role" && values.role_id) {
        await setUserRoles.mutateAsync({ userId: member.user_id, roleIds: [values.role_id] });
      }
      handleClose();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  });

  const handleRemove = async () => {
    setError(null);
    try {
      await remove.mutateAsync(member.user_id);
      setDeleteOpen(false);
      handleClose();
      onRemoved?.();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  };

  /** Single close path — Cancel/Done button, successful submit, and the
   * Modal's own dismiss (backdrop/Escape) all funnel through this so local
   * error/tab state never leaks into the next time this modal opens. */
  function handleClose() {
    setError(null);
    setShowPassword(false);
    state.close();
  }

  const saving = isSubmitting || update.isPending || setUserRoles.isPending;

  return (
    <>
      <Modal
        isOpen={state.isOpen}
        onOpenChange={(open) => {
          if (open) state.setOpen(true);
          else handleClose();
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{member.full_name || member.email || "Team member"}</Modal.Heading>
              </Modal.Header>
              <form onSubmit={onSubmit} noValidate>
                <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as EditMemberTab)}>
                  <div className="px-6">
                    <Tabs.List>
                      <Tabs.Tab id="profile">Profile</Tabs.Tab>
                      <Tabs.Tab id="role">Role</Tabs.Tab>
                      <Tabs.Tab id="sip">SIP</Tabs.Tab>
                    </Tabs.List>
                  </div>

                  <Modal.Body className="flex flex-col gap-4">
                    <Tabs.Panel id="profile">
                      <div className="flex flex-col gap-4">
                        <TextField isDisabled value={member.email ?? ""}>
                          <Label>Email</Label>
                          <Input />
                        </TextField>

                        <Controller
                          name="full_name"
                          control={control}
                          render={({ field, fieldState }) => (
                            <TextField {...field} isInvalid={fieldState.invalid}>
                              <Label>Full name</Label>
                              <Input />
                              <FieldError>{fieldState.error?.message}</FieldError>
                            </TextField>
                          )}
                        />

                        <Controller
                          name="phone"
                          control={control}
                          render={({ field, fieldState }) => (
                            <TextField {...field} isInvalid={fieldState.invalid}>
                              <Label>Phone</Label>
                              <Input />
                              <FieldError>{fieldState.error?.message}</FieldError>
                            </TextField>
                          )}
                        />

                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <Select
                              aria-label="Status"
                              value={field.value}
                              isDisabled={member.is_owner}
                              onChange={(key) => {
                                if (typeof key === "string") field.onChange(key);
                              }}
                            >
                              <Label>Status</Label>
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox
                                  items={[
                                    { id: "active", label: "Active" },
                                    { id: "inactive", label: "Deactivated" },
                                  ]}
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
                          )}
                        />

                        <Controller
                          name="password"
                          control={control}
                          render={({ field, fieldState }) => (
                            <TextField {...field} isInvalid={fieldState.invalid}>
                              <Label>Reset password</Label>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Leave blank to keep current password"
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword((v) => !v)}
                                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-foreground/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                  {showPassword ? (
                                    <EyeSlash className="size-4" aria-hidden="true" />
                                  ) : (
                                    <Eye className="size-4" aria-hidden="true" />
                                  )}
                                </button>
                              </div>
                              <FieldError>{fieldState.error?.message}</FieldError>
                            </TextField>
                          )}
                        />
                      </div>
                    </Tabs.Panel>

                    <Tabs.Panel id="role">
                      <Controller
                        name="role_id"
                        control={control}
                        render={({ field }) => (
                          <Select
                            aria-label="Workspace role"
                            value={field.value || undefined}
                            placeholder={roleOptions.length === 0 ? "No roles yet" : "Select a role"}
                            isDisabled={roleOptions.length === 0 || member.is_owner}
                            onChange={(key) => {
                              if (typeof key === "string") field.onChange(key);
                            }}
                          >
                            <Label>Role</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox items={roleOptions}>
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
                      />
                      <p className="mt-2 text-xs text-foreground/50">
                        A member has exactly one workspace role, assigned from Settings → Roles &amp; Permissions.
                      </p>
                    </Tabs.Panel>

                    <Tabs.Panel id="sip">
                      <div className="flex flex-col gap-6">
                        <section>
                          <h3 className="mb-3 text-sm font-semibold">SIP accounts</h3>
                          <SipAccountsPanel workspaceId={workspaceId} userId={member.user_id} enabled={state.isOpen && tab === "sip"} />
                        </section>
                        <section className="border-t border-black/[0.08] pt-5 dark:border-white/[0.12]">
                          <h3 className="mb-3 text-sm font-semibold">GSM lines</h3>
                          <GsmLinesPanel userId={member.user_id} enabled={state.isOpen && tab === "sip"} />
                        </section>
                        <section className="border-t border-black/[0.08] pt-5 dark:border-white/[0.12]">
                          <h3 className="mb-3 text-sm font-semibold">SMS gateways</h3>
                          <SmsGatewayPanel userId={member.user_id} enabled={state.isOpen && tab === "sip"} />
                        </section>
                      </div>
                    </Tabs.Panel>

                    {error ? (
                      <p role="alert" className="text-sm text-danger">
                        {error}
                      </p>
                    ) : null}
                  </Modal.Body>
                </Tabs>

                <Modal.Footer className="flex items-center justify-between gap-2">
                  <div>
                    {!isSelf && !member.is_owner ? (
                      <Button type="button" variant="danger-soft" size="sm" onPress={() => setDeleteOpen(true)}>
                        Remove member
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" onPress={handleClose}>
                      Cancel
                    </Button>
                    {tab !== "sip" ? (
                      <Button type="submit" variant="primary" isDisabled={saving}>
                        {saving ? "Saving…" : "Save changes"}
                      </Button>
                    ) : (
                      <Button type="button" variant="primary" onPress={handleClose}>
                        Done
                      </Button>
                    )}
                  </div>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <DeleteMemberConfirm
        isOpen={deleteOpen}
        memberName={member.full_name || member.email || "this member"}
        memberEmail={member.email ?? "REMOVE"}
        loading={remove.isPending}
        onConfirm={handleRemove}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
