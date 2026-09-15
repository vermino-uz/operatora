"use client";

import { Modal, type UseOverlayStateReturn } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFormSubmissionsQuery } from "@/features/forms/hooks/useForms";
import type { FormRow } from "@/features/forms/types";

function renderCellValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value == null ? "" : String(value);
}

/** Read-only — `form_submissions` has no write path from the builder (only
 * the not-yet-implemented public submit route inserts rows; see
 * `publicFormTypes.ts`). Plain semantic `<table>`, no server pagination to
 * drive TanStack Table off of, matching `SoldLeadsTable`'s precedent. */
export function FormSubmissionsDialog({ state, form }: { state: UseOverlayStateReturn; form: FormRow | null }) {
  const query = useFormSubmissionsQuery(form?.id ?? null, state.isOpen);
  const submissions = query.data ?? [];

  const displayFields = (() => {
    const names = new Set<string>();
    for (const s of submissions) {
      Object.keys(s.data ?? {}).forEach((k) => names.add(k));
    }
    return Array.from(names);
  })();

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => state.setOpen(open)}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Submissions — {form?.name ?? "Form"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="max-h-[70vh] overflow-y-auto">
              {query.isLoading ? (
                <LoadingState label="Loading submissions…" className="py-12" />
              ) : query.isError ? (
                <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-12" />
              ) : submissions.length === 0 ? (
                <EmptyState
                  title="No submissions yet"
                  description="Submissions will appear here once someone fills out this form's public link."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/[0.08] text-foreground/60 dark:border-white/[0.12]">
                        <th className="whitespace-nowrap py-2 pr-4 font-medium">Submitted</th>
                        {displayFields.map((name) => (
                          <th key={name} className="whitespace-nowrap py-2 pr-4 font-medium capitalize">
                            {name.replace(/_/g, " ")}
                          </th>
                        ))}
                        <th className="whitespace-nowrap py-2 pr-4 font-medium">Lead</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s) => (
                        <tr key={s.id} className="border-b border-black/[0.05] dark:border-white/[0.08]">
                          <td className="py-2 pr-4 whitespace-nowrap text-foreground/70">
                            {new Date(s.submitted_at).toLocaleString()}
                          </td>
                          {displayFields.map((name) => (
                            <td key={name} className="max-w-[220px] truncate py-2 pr-4" title={renderCellValue(s.data?.[name])}>
                              {renderCellValue(s.data?.[name])}
                            </td>
                          ))}
                          <td className="py-2 pr-4 text-foreground/70">{s.lead_id ? "Linked" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
