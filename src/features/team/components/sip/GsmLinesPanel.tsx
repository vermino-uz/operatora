"use client";

import { useState } from "react";
import { Button, Input, Label, Modal, TextField, useOverlayState } from "@heroui/react";
import { Eye, EyeSlash, Pencil, Smartphone, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import {
  useCreateGsmLineMutation,
  useDeleteGsmLineMutation,
  useOperatorGsmQuery,
  useUpdateGsmLineMutation,
} from "@/features/team/hooks/useOperatorGsm";
import type { GsmLineRow } from "@/features/team/types";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage this operator's GSM lines.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

interface FormState {
  id?: string;
  sip_server: string;
  sip_password: string;
  sim_number: string;
  line_name: string;
}

const emptyForm = (): FormState => ({ sip_server: "", sip_password: "", sim_number: "", line_name: "" });

export function GsmLinesPanel({ userId, enabled }: { userId: string; enabled: boolean }) {
  const query = useOperatorGsmQuery(userId, enabled);
  const create = useCreateGsmLineMutation(userId);
  const update = useUpdateGsmLineMutation(userId);
  const del = useDeleteGsmLineMutation(userId);

  const dialog = useOverlayState();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<GsmLineRow | null>(null);

  const lines = query.data ?? [];
  const saving = create.isPending || update.isPending;

  function openAdd() {
    setForm(emptyForm());
    setShowPassword(false);
    setError(null);
    dialog.open();
  }

  function openEdit(line: GsmLineRow) {
    setForm({
      id: line.id,
      sip_server: line.sip_server ?? "",
      sip_password: line.sip_password ?? "",
      sim_number: line.sim_number ?? "",
      line_name: line.line_name ?? "",
    });
    setShowPassword(false);
    setError(null);
    dialog.open();
  }

  const canSave = form.sim_number.trim() && form.sip_server.trim() && (form.id || form.sip_password.trim());

  async function handleSave() {
    if (saving) return;
    setError(null);
    try {
      if (form.id) {
        await update.mutateAsync({
          id: form.id,
          input: {
            sip_server: form.sip_server.trim(),
            sip_password: form.sip_password.trim() || undefined,
            sim_number: form.sim_number.trim(),
            line_name: form.line_name.trim() || null,
          },
        });
      } else {
        await create.mutateAsync({
          sip_server: form.sip_server.trim(),
          sip_password: form.sip_password.trim(),
          sim_number: form.sim_number.trim(),
          line_name: form.line_name.trim() || null,
        });
      }
      dialog.close();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  if (query.isLoading) return <LoadingState label="Loading GSM lines…" className="py-8" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-8" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-foreground/50">SIM-based GSM lines this operator can register on their device.</p>
        <Button size="sm" variant="secondary" onPress={openAdd}>
          <Smartphone className="size-3.5" aria-hidden="true" />
          Add line
        </Button>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/[0.1] py-8 text-center text-sm text-foreground/50 dark:border-white/[0.15]">
          No GSM lines yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.08] bg-black/[0.02] text-left text-xs font-medium text-foreground/50 dark:border-white/[0.12] dark:bg-white/[0.03]">
                <th className="px-4 py-2 font-medium">Line name</th>
                <th className="px-4 py-2 font-medium">SIM number</th>
                <th className="px-4 py-2 font-medium">SIP server</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-black/[0.06] last:border-b-0 dark:border-white/[0.08]">
                  <td className="px-4 py-2.5">{line.line_name || "—"}</td>
                  <td className="px-4 py-2.5 text-foreground/70">{line.sim_number || "—"}</td>
                  <td className="px-4 py-2.5 text-foreground/70">{line.sip_server || "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" isIconOnly aria-label="Edit" onPress={() => openEdit(line)}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger-soft"
                        isIconOnly
                        aria-label="Delete"
                        onPress={() => setRemoveTarget(line)}
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
                <Modal.Heading>{form.id ? "Edit GSM line" : "Add GSM line"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <TextField value={form.line_name} onChange={(value) => setForm((p) => ({ ...p, line_name: value }))}>
                  <Label>Line name</Label>
                  <Input placeholder="Front desk SIM" />
                </TextField>
                <TextField value={form.sim_number} onChange={(value) => setForm((p) => ({ ...p, sim_number: value }))} isRequired>
                  <Label>SIM number</Label>
                  <Input placeholder="+998901234567" />
                </TextField>
                <TextField value={form.sip_server} onChange={(value) => setForm((p) => ({ ...p, sip_server: value }))} isRequired>
                  <Label>SIP server</Label>
                  <Input placeholder="sip.gsmgateway.uz" />
                </TextField>
                <TextField
                  value={form.sip_password}
                  onChange={(value) => setForm((p) => ({ ...p, sip_password: value }))}
                  isRequired={!form.id}
                >
                  <Label>SIP password</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} className="pr-10 font-mono" autoComplete="new-password" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-foreground/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeSlash className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                  {form.id ? <p className="mt-1 text-xs text-foreground/50">Leave blank to keep the saved password.</p> : null}
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
                <Modal.Heading>Remove GSM line</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">This will remove the GSM line permanently.</p>
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
