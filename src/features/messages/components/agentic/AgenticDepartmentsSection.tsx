"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCreateDepartmentMutation, useDepartmentsQuery } from "@/features/departments/hooks/useDepartments";
import { DepartmentCard } from "@/features/departments/components/DepartmentCard";
import { WorkspaceGroupConnect } from "@/features/departments/components/WorkspaceGroupConnect";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Couldn't create the department.";
}

/** Inline departments section for Agent Mode settings — reuses shared department components. */
export function AgenticDepartmentsSection() {
  const departmentsQuery = useDepartmentsQuery();
  const createDept = useCreateDepartmentMutation();
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  async function create() {
    if (createDept.isPending) return;
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

  if (departmentsQuery.isLoading) {
    return <LoadingState label="Loading departments…" className="py-8" />;
  }

  const departments = departmentsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex max-w-[420px] items-end gap-2">
        <TextField value={newName} onChange={setNewName} className="flex-1">
          <Label className="text-[11px] text-foreground/50">New department</Label>
          <Input
            placeholder="e.g. Sales"
            onKeyDown={(e) => e.key === "Enter" && void create()}
          />
        </TextField>
        <Button onPress={create} isDisabled={createDept.isPending || !newName.trim()}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
      {createError ? (
        <p role="alert" className="text-xs text-danger">
          {createError}
        </p>
      ) : null}

      <WorkspaceGroupConnect />

      {departments.length === 0 ? (
        <EmptyState
          title="No departments yet"
          description="Add one above, then set its contact and routing prompt."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {departments.map((d) => (
            <DepartmentCard key={d.id} department={d} />
          ))}
        </div>
      )}
    </div>
  );
}
