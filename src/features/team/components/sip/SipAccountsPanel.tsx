"use client";

import { useState } from "react";
import { Button, Chip, Input, Label, TextField } from "@heroui/react";
import { CircleCheckFill, Eye, EyeSlash, Handset, Pencil, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { normalizeSipServerHost } from "@/features/team/sip-server.util";
import {
  useActivateOperatorSipMutation,
  useDeleteOperatorSipMutation,
  useOperatorSipQuery,
  useUpsertOperatorSipMutation,
} from "@/features/team/hooks/useOperatorSip";
import type { OperatorSipAccount } from "@/features/team/types";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage this operator's SIP accounts.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

interface FormState {
  id?: string;
  sip_number: string;
  password: string;
  server: string;
  gsm_number: string;
}

const emptyForm = (): FormState => ({ sip_number: "", password: "", server: "", gsm_number: "" });

/**
 * Per-operator SIP telephony accounts — full CRUD + activate, ported from
 * the old frontend's `WorkspaceSipAccountsPanel.tsx` against the real
 * `/admin-users/operators/:userId/sip*` contract. Multiple accounts per
 * operator, exactly one may be active at a time.
 */
export function SipAccountsPanel({ workspaceId, userId, enabled }: { workspaceId: string; userId: string; enabled: boolean }) {
  const query = useOperatorSipQuery(workspaceId, userId, enabled);
  const upsert = useUpsertOperatorSipMutation(workspaceId, userId);
  const activate = useActivateOperatorSipMutation(workspaceId, userId);
  const del = useDeleteOperatorSipMutation(workspaceId, userId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingHasPassword, setEditingHasPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accounts = query.data ?? [];

  function resetForm() {
    setForm(emptyForm());
    setEditingHasPassword(false);
    setShowPassword(false);
    setShowForm(false);
    setError(null);
  }

  function openAdd() {
    setForm(emptyForm());
    setEditingHasPassword(false);
    setShowPassword(false);
    setError(null);
    setShowForm(true);
  }

  function openEdit(account: OperatorSipAccount) {
    setForm({
      id: account.id,
      sip_number: account.sip_number,
      password: account.password ?? "",
      server: normalizeSipServerHost(account.server),
      gsm_number: account.gsm_number,
    });
    setEditingHasPassword(account.has_password);
    setShowPassword(false);
    setError(null);
    setShowForm(true);
  }

  const normalizedServer = normalizeSipServerHost(form.server);
  const canSave = form.sip_number.trim() && normalizedServer && (form.id || form.password.trim());

  async function handleSave() {
    if (upsert.isPending) return; // guard double-submit
    setError(null);
    try {
      await upsert.mutateAsync({
        id: form.id,
        sip_number: form.sip_number.trim(),
        server: normalizedServer,
        gsm_number: form.gsm_number.trim() || undefined,
        password: form.password.trim() || undefined,
      });
      resetForm();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  if (query.isLoading) return <LoadingState label="Loading SIP accounts…" className="py-8" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-8" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-foreground/50">An operator may have multiple SIP accounts; one is active at a time.</p>
        <Button size="sm" variant="secondary" onPress={openAdd}>
          <Handset className="size-3.5" aria-hidden="true" />
          Add account
        </Button>
      </div>

      {accounts.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-black/[0.1] py-8 text-center text-sm text-foreground/50 dark:border-white/[0.15]">
          No SIP accounts yet.
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                account.is_active
                  ? "border-primary/30 bg-primary/5"
                  : "border-black/[0.08] dark:border-white/[0.12]"
              }`}
            >
              <Handset className="size-4 shrink-0 text-foreground/40" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm font-semibold">{account.sip_number || "—"}</p>
                  {account.is_active ? (
                    <Chip size="sm" color="accent" variant="soft">
                      <CircleCheckFill className="size-3" aria-hidden="true" />
                      <Chip.Label>Active</Chip.Label>
                    </Chip>
                  ) : null}
                </div>
                <p className="truncate text-xs text-foreground/50">{normalizeSipServerHost(account.server) || "—"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!account.is_active ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={activate.isPending}
                    onPress={() => activate.mutate(account.id)}
                  >
                    Set active
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" isIconOnly aria-label="Edit" onPress={() => openEdit(account)}>
                  <Pencil className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="danger-soft"
                  isIconOnly
                  aria-label="Delete"
                  isDisabled={del.isPending}
                  onPress={() => del.mutate(account.id)}
                >
                  <TrashBin className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="space-y-4 rounded-xl border border-black/[0.08] bg-black/[0.02] p-4 dark:border-white/[0.12] dark:bg-white/[0.03]">
          <p className="text-sm font-semibold">{form.id ? "Edit SIP account" : "Add SIP account"}</p>
          <TextField value={form.sip_number} onChange={(value) => setForm((p) => ({ ...p, sip_number: value }))}>
            <Label>SIP number</Label>
            <Input />
          </TextField>
          <TextField value={form.password} onChange={(value) => setForm((p) => ({ ...p, password: value }))}>
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                className="pr-10 font-mono"
                autoComplete="new-password"
                placeholder={form.id && editingHasPassword && !form.password ? "••••••••" : "Enter password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-foreground/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlash className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
            {form.id && editingHasPassword && !form.password ? (
              <p className="mt-1 text-xs font-medium text-success">Saved password on file — leave blank to keep it.</p>
            ) : null}
          </TextField>
          <TextField value={form.server} onChange={(value) => setForm((p) => ({ ...p, server: value }))}>
            <Label>Server hostname</Label>
            <Input placeholder="sip.operatora.uz" />
          </TextField>
          <TextField value={form.gsm_number} onChange={(value) => setForm((p) => ({ ...p, gsm_number: value }))}>
            <Label>Caller ID</Label>
            <Input placeholder="+998901234567" />
          </TextField>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onPress={resetForm}>
              Cancel
            </Button>
            <Button variant="primary" isDisabled={!canSave || upsert.isPending} onPress={handleSave}>
              {upsert.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
