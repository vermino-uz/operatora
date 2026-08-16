"use client";

import { useState } from "react";
import { Button, Input, Label, Modal, TextField, useOverlayState } from "@heroui/react";
import { Comment, Pencil, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import {
  useCreateSmsGatewayMutation,
  useDeleteSmsGatewayMutation,
  useOperatorSmsGatewaysQuery,
  useUpdateSmsGatewayMutation,
} from "@/features/team/hooks/useOperatorSmsGateways";
import type { SmsGatewayRow } from "@/features/team/types";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage this operator's SMS gateways.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

interface FormState {
  id?: string;
  provider_name: string;
  sender_id: string;
  sms_port: string;
  base_url: string;
  auth_username: string;
  auth_password: string;
  has_password?: boolean;
}

const emptyForm = (): FormState => ({
  provider_name: "",
  sender_id: "",
  sms_port: "",
  base_url: "",
  auth_username: "",
  auth_password: "",
});

export function SmsGatewayPanel({ userId, enabled }: { userId: string; enabled: boolean }) {
  const query = useOperatorSmsGatewaysQuery(userId, enabled);
  const create = useCreateSmsGatewayMutation(userId);
  const update = useUpdateSmsGatewayMutation(userId);
  const del = useDeleteSmsGatewayMutation(userId);

  const dialog = useOverlayState();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SmsGatewayRow | null>(null);

  const gateways = query.data ?? [];
  const saving = create.isPending || update.isPending;

  function openAdd() {
    setForm(emptyForm());
    setError(null);
    dialog.open();
  }

  function openEdit(gw: SmsGatewayRow) {
    setForm({
      id: gw.id,
      provider_name: gw.provider_name ?? "",
      sender_id: gw.sender_id ?? "",
      sms_port: String(gw.sms_port ?? ""),
      base_url: gw.base_url ?? "",
      auth_username: gw.auth_username ?? "",
      auth_password: "",
      has_password: gw.has_password,
    });
    setError(null);
    dialog.open();
  }

  const port = Number.parseInt(form.sms_port, 10);
  const canSave = form.provider_name.trim() && form.sender_id.trim() && form.sms_port.trim() && !Number.isNaN(port);

  async function handleSave() {
    if (saving) return;
    setError(null);
    if (Number.isNaN(port)) {
      setError("SMS port must be a number.");
      return;
    }
    try {
      const input = {
        provider_name: form.provider_name.trim(),
        sender_id: form.sender_id.trim(),
        sms_port: port,
        base_url: form.base_url.trim() || undefined,
        auth_username: form.auth_username.trim() || undefined,
        auth_password: form.auth_password.trim() || undefined,
      };
      if (form.id) {
        await update.mutateAsync({ id: form.id, input });
      } else {
        await create.mutateAsync(input);
      }
      dialog.close();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  if (query.isLoading) return <LoadingState label="Loading SMS gateways…" className="py-8" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-8" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-foreground/50">Per-operator SMS gateway connections for outbound text messages.</p>
        <Button size="sm" variant="secondary" onPress={openAdd}>
          <Comment className="size-3.5" aria-hidden="true" />
          Add gateway
        </Button>
      </div>

      {gateways.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/[0.1] py-8 text-center text-sm text-foreground/50 dark:border-white/[0.15]">
          No SMS gateways yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.08] bg-black/[0.02] text-left text-xs font-medium text-foreground/50 dark:border-white/[0.12] dark:bg-white/[0.03]">
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Sender / login</th>
                <th className="px-4 py-2 font-medium">SMS port</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {gateways.map((gw) => (
                <tr key={gw.id} className="border-b border-black/[0.06] last:border-b-0 dark:border-white/[0.08]">
                  <td className="px-4 py-2.5">{gw.provider_name || "—"}</td>
                  <td className="px-4 py-2.5 text-foreground/70">{gw.sender_id || "—"}</td>
                  <td className="px-4 py-2.5 text-foreground/70">{gw.sms_port ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" isIconOnly aria-label="Edit" onPress={() => openEdit(gw)}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger-soft"
                        isIconOnly
                        aria-label="Delete"
                        onPress={() => setRemoveTarget(gw)}
                      >
                        <TrashBin className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={dialog.isOpen} onOpenChange={(open) => (open ? dialog.setOpen(true) : dialog.close())}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{form.id ? "Edit SMS gateway" : "Add SMS gateway"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <TextField value={form.provider_name} onChange={(value) => setForm((p) => ({ ...p, provider_name: value }))} isRequired>
                  <Label>Provider name</Label>
                  <Input placeholder="Eskiz" />
                </TextField>
                <TextField value={form.sender_id} onChange={(value) => setForm((p) => ({ ...p, sender_id: value }))} isRequired>
                  <Label>Sender / login</Label>
                  <Input placeholder="1004" />
                </TextField>
                <TextField value={form.sms_port} onChange={(value) => setForm((p) => ({ ...p, sms_port: value }))} isRequired>
                  <Label>SMS port</Label>
                  <Input inputMode="numeric" placeholder="4" />
                </TextField>
                <TextField value={form.base_url} onChange={(value) => setForm((p) => ({ ...p, base_url: value }))}>
                  <Label>Gateway base URL</Label>
                  <Input inputMode="url" placeholder="http://10.90.10.20:3000/api" />
                </TextField>
                <TextField value={form.auth_username} onChange={(value) => setForm((p) => ({ ...p, auth_username: value }))}>
                  <Label>Auth username</Label>
                  <Input autoComplete="off" placeholder="admin" />
                </TextField>
                <TextField value={form.auth_password} onChange={(value) => setForm((p) => ({ ...p, auth_password: value }))}>
                  <Label>Auth password</Label>
                  <Input type="password" autoComplete="new-password" placeholder={form.has_password ? "••••••••" : ""} />
                  {form.has_password ? (
                    <p className="mt-1 text-xs text-foreground/50">Leave blank to keep the saved password.</p>
                  ) : null}
                </TextField>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => dialog.close()}>
                  Cancel
                </Button>
                <Button variant="primary" isDisabled={!canSave || saving} onPress={handleSave}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Remove SMS gateway</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">This will remove the SMS gateway permanently.</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setRemoveTarget(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  isDisabled={del.isPending}
                  onPress={() => {
                    if (removeTarget) del.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) });
                  }}
                >
                  {del.isPending ? "Removing…" : "Remove"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
