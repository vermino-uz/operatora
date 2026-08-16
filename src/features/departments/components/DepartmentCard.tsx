"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { ChevronDown, Persons as Users2, Plus, PaperPlane, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import {
  useAddDepartmentMemberMutation,
  useDeleteDepartmentMutation,
  useSendDepartmentTestMessageMutation,
  useUpdateDepartmentMutation,
} from "@/features/departments/hooks/useDepartments";
import type { WorkspaceDepartment } from "@/features/departments/types";
import { MemberRow } from "@/features/departments/components/MemberRow";
import { RoutingPromptField } from "@/features/departments/components/RoutingPromptField";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only workspace owners/admins can manage departments.";
    return error.message;
  }
  return fallback;
}

export function DepartmentCard({ department }: { department: WorkspaceDepartment }) {
  const updateDept = useUpdateDepartmentMutation();
  const deleteDept = useDeleteDepartmentMutation();
  const addMember = useAddDepartmentMemberMutation();
  const sendTest = useSendDepartmentTestMessageMutation();

  const [name, setName] = useState(department.name);
  const notifyMode = department.notify_mode ?? "dm";
  // A freshly-created department (no members, no routing prompt yet) opens
  // expanded so it's obvious it still needs setup; an already-configured
  // one starts collapsed so many departments doesn't turn into one long
  // scroll — same heuristic as the old frontend.
  const [isOpen, setIsOpen] = useState(department.members.length === 0 && !department.routing_prompt);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function saveIfChanged(patch: Record<string, string>, revert: () => void) {
    setError(null);
    try {
      await updateDept.mutateAsync({ id: department.id, patch });
    } catch (err) {
      setError(errorMessage(err, "Couldn't save that change."));
      revert();
    }
  }

  async function remove() {
    if (deleteDept.isPending) return; // guard double-submit
    if (!window.confirm("Delete this department?")) return;
    setError(null);
    try {
      await deleteDept.mutateAsync(department.id);
    } catch (err) {
      setError(errorMessage(err, "Couldn't delete this department."));
    }
  }

  async function addPerson() {
    if (addMember.isPending) return; // guard double-submit
    setError(null);
    try {
      await addMember.mutateAsync({ departmentId: department.id, input: {} });
    } catch (err) {
      setError(errorMessage(err, "Couldn't add a member."));
    }
  }

  const memberCount = department.members.length;

  async function sendTestMessage() {
    if (sendTest.isPending) return; // guard double-submit
    setError(null);
    setTestResult(null);
    try {
      const res = await sendTest.mutateAsync(department.id);
      setTestResult(
        res.mode === "group" ? "Test message posted to the shared group." : `Test message sent to ${res.sentTo} member(s).`,
      );
    } catch (err) {
      setError(errorMessage(err, "Couldn't send a test message."));
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/[0.08] bg-background p-4 dark:border-white/[0.12]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Collapse" : "Expand"}
          className="-ml-1 flex size-6 shrink-0 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        >
          <ChevronDown className={`size-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
        </button>
        <Users2 className="size-4 shrink-0 text-foreground/50" />
        {isOpen ? (
          <TextField
            value={name}
            onChange={setName}
            onBlur={() => {
              const trimmed = name.trim();
              if (!trimmed || trimmed === department.name) {
                setName(department.name);
                return;
              }
              void saveIfChanged({ name: trimmed }, () => setName(department.name));
            }}
            aria-label="Department name"
            className="max-w-[280px]"
          >
            <Input />
          </TextField>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="max-w-[280px] truncate text-left text-sm font-medium text-foreground hover:text-primary"
          >
            {department.name}
          </button>
        )}
        {!isOpen && (
          <span className="truncate text-xs text-foreground/50">
            {memberCount} {memberCount === 1 ? "person" : "people"}
            {department.routing_prompt ? ` · ${department.routing_prompt}` : ""}
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label="Delete department"
          className="ml-auto shrink-0"
          onPress={remove}
          isDisabled={deleteDept.isPending}
        >
          <TrashBin className="size-3.5" />
        </Button>
      </div>

      {isOpen ? (
        <>
          <div className="flex flex-col gap-2">
            {department.members.map((m) => (
              <MemberRow key={m.id} departmentId={department.id} member={m} notifyMode={notifyMode} />
            ))}
            {notifyMode === "group" ? (
              <p className="text-xs text-foreground/50">
                Uses the workspace&apos;s shared escalation group, connected below.
              </p>
            ) : null}
            <Button size="sm" variant="secondary" className="self-start" onPress={addPerson} isDisabled={addMember.isPending}>
              <Plus className="size-3.5" />
              {addMember.isPending ? "Adding…" : "Add person"}
            </Button>
          </div>

          <div>
            <Label>Notify via</Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => notifyMode !== "dm" && void saveIfChanged({ notify_mode: "dm" }, () => {})}
                className={`h-8 rounded-lg border px-3 text-xs font-semibold ${
                  notifyMode === "dm" ? "border-primary bg-primary/5 text-foreground" : "border-black/[0.12] text-foreground/60 dark:border-white/[0.16]"
                }`}
              >
                Direct message
              </button>
              <button
                type="button"
                onClick={() => notifyMode !== "group" && void saveIfChanged({ notify_mode: "group" }, () => {})}
                className={`h-8 rounded-lg border px-3 text-xs font-semibold ${
                  notifyMode === "group" ? "border-primary bg-primary/5 text-foreground" : "border-black/[0.12] text-foreground/60 dark:border-white/[0.16]"
                }`}
              >
                Group (mentions username)
              </button>
              <Button
                size="sm"
                variant="secondary"
                className="ml-auto"
                onPress={sendTestMessage}
                isDisabled={sendTest.isPending || memberCount === 0}
              >
                <PaperPlane className="size-3.5" />
                {sendTest.isPending ? "Sending…" : "Send test message"}
              </Button>
            </div>
          </div>

          <RoutingPromptField department={department} />

          {testResult ? <p className="text-xs text-success">{testResult}</p> : null}
          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
