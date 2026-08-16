"use client";

import { useState } from "react";
import { Button, Label, TextArea, TextField } from "@heroui/react";

import { ApiError } from "@/types/api";
import {
  useRefineRoutingPromptMutation,
  useUpdateDepartmentMutation,
} from "@/features/departments/hooks/useDepartments";
import type { WorkspaceDepartment } from "@/features/departments/types";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    return error.message;
  }
  return "Couldn't save the routing prompt.";
}

/**
 * Its own explicit Save (not the blur-autosave the rest of the card uses) —
 * mirrors the old frontend's `RoutingPromptField.tsx` reasoning verbatim:
 * blur fires on every focus loss, including mid-dictation on voice input,
 * which can save a stray partial word; an explicit Save makes "I'm done
 * editing" unambiguous and gives the AI refine step (a couple seconds) a
 * place to show progress.
 */
export function RoutingPromptField({ department }: { department: WorkspaceDepartment }) {
  const updateDept = useUpdateDepartmentMutation();
  const refinePrompt = useRefineRoutingPromptMutation();
  const [routingPrompt, setRoutingPrompt] = useState(department.routing_prompt ?? "");
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refineNote, setRefineNote] = useState<string | null>(null);

  const trimmed = routingPrompt.trim();
  const isDirty = trimmed !== (department.routing_prompt ?? "");
  const busy = refinePrompt.isPending || updateDept.isPending;

  async function save() {
    if (busy) return; // guard double-submit
    setError(null);
    setRefineNote(null);
    let toSave = trimmed;
    if (trimmed) {
      try {
        const refined = await refinePrompt.mutateAsync({ id: department.id, routingPrompt: trimmed });
        toSave = refined.refined_prompt || trimmed;
        setRoutingPrompt(toSave);
        if (refined.notes) setRefineNote(refined.notes);
      } catch {
        // best-effort — save the operator's raw text if refine fails
      }
    }
    try {
      await updateDept.mutateAsync({ id: department.id, patch: { routing_prompt: toSave } });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <TextField value={routingPrompt} onChange={setRoutingPrompt} isDisabled={busy}>
      <Label>Route here when…</Label>
      <TextArea
        rows={5}
        placeholder="e.g. billing issues, refund requests, payment failures"
        className={refinePrompt.isPending ? "animate-pulse" : undefined}
      />
      <p className="mt-1 text-xs text-foreground/50">
        {refinePrompt.isPending
          ? "AI is refining this…"
          : "Describe what kinds of problems should go to this department — used by the AI agent to pick it automatically."}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <Button size="sm" variant="secondary" onPress={save} isDisabled={!isDirty || busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        {justSaved ? <span className="text-xs font-medium text-success">Saved</span> : null}
      </div>
      {refineNote ? <p className="mt-1 text-xs text-foreground/50">{refineNote}</p> : null}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </TextField>
  );
}
