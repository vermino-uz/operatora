import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { formsApi } from "@/services/api/forms";
import type { FormBuilderField, FormRow } from "@/features/forms/types";

const formsKey = (workspaceId: string | null) => ["forms", workspaceId ?? "none"] as const;
const formSubmissionsKey = (formId: string) => ["form-submissions", formId] as const;

export function useFormsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: formsKey(workspaceId),
    queryFn: () => formsApi.list(),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/** Submission counts for the visible forms — one request, not N (see
 * `services/api/forms.ts`). Depends on the forms list so it only refetches
 * when the set of form ids actually changes. */
export function useFormSubmissionCountsQuery(workspaceId: string | null, forms: FormRow[]) {
  const ids = forms.map((f) => f.id);
  return useQuery({
    queryKey: [...formsKey(workspaceId), "submission-counts", ids.slice().sort().join(",")],
    queryFn: () => formsApi.submissionCounts(ids),
    enabled: !!workspaceId && ids.length > 0,
    staleTime: 30_000,
  });
}

export function useFormSubmissionsQuery(formId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: formSubmissionsKey(formId ?? ""),
    queryFn: () => formsApi.submissions(formId as string),
    enabled: enabled && !!formId,
    staleTime: 15_000,
  });
}

export function useCreateFormMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description: string | null;
      type: string;
      status: string;
      thank_you_message: string | null;
      fields: FormBuilderField[];
      created_by: string | null;
    }) => formsApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: formsKey(workspaceId) });
    },
  });
}

export function useUpdateFormMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        name: string;
        description: string | null;
        type: string;
        status: string;
        thank_you_message: string | null;
        fields: FormBuilderField[];
      };
    }) => formsApi.update(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: formsKey(workspaceId) });
    },
  });
}

export function useDeleteFormsMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => formsApi.removeMany(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: formsKey(workspaceId) });
    },
  });
}
