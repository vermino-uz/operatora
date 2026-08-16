"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { useCreateDepartmentMutation, useDepartmentsQuery } from "@/features/departments/hooks/useDepartments";
import { DepartmentCard } from "@/features/departments/components/DepartmentCard";
import { WorkspaceGroupConnect } from "@/features/departments/components/WorkspaceGroupConnect";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only workspace owners/admins can create departments.";
    return error.message;
  }
  return "Couldn't create the department.";
}

/**
 * Departments — escalation routing groups, `GET/POST/PATCH/DELETE
 * /departments*`. Traced from the old frontend's `DepartmentsManager.tsx`;
 * see `features/departments/types.ts` for the confirmed contract.
 */
export function DepartmentsPanel() {
  const departmentsQuery = useDepartmentsQuery();
  const createDept = useCreateDepartmentMutation();
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  async function create() {
    if (createDept.isPending) return; // guard double-submit
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreateError(null);
    try {
      await createDept.mutateAsync({ name: trimmed });
      setNewName("");
    } catch (err) {
      setCreateError(errorMessage(err));
    }
  }

  const shellProps = {
    title: "Departments",
    subtitle: "Route AI-agent escalations to the right staff via Telegram.",
  } as const;

  if (departmentsQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading departments…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (departmentsQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={departmentsQuery.error} onRetry={() => departmentsQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  const departments = departmentsQuery.data ?? [];

  return (
    <SettingsSectionShell {...shellProps}>
      <p className="mb-5 text-sm text-foreground/60">
        Route AI-agent escalations to the right people. A department can have several members — when the agent
        can&apos;t handle a message, each of them gets a Telegram DM from your bot.
      </p>

      <div className="flex items-end gap-2">
        <TextField value={newName} onChange={setNewName} className="max-w-[280px] flex-1">
          <Label>New department</Label>
          <Input placeholder="e.g. Sales" onKeyDown={(e) => e.key === "Enter" && void create()} />
        </TextField>
        <Button onPress={create} isDisabled={createDept.isPending || !newName.trim()}>
          <Plus className="size-3.5" />
          {createDept.isPending ? "Adding…" : "Add"}
        </Button>
      </div>
      {createError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {createError}
        </p>
      ) : null}

      <div className="my-6 border-t border-black/[0.08] dark:border-white/[0.12]" />

      <WorkspaceGroupConnect />

      <div className="my-6 border-t border-black/[0.08] dark:border-white/[0.12]" />

      {departments.length === 0 ? (
        <EmptyState title="No departments yet" description="Add one above, then set its contact info below." />
      ) : (
        <div className="flex flex-col gap-3">
          {departments.map((d) => (
            <DepartmentCard key={d.id} department={d} />
          ))}
        </div>
      )}
    </SettingsSectionShell>
  );
}
