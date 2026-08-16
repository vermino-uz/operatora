import { useMutation, useQueryClient } from "@tanstack/react-query";

import { settingsApi } from "@/services/api/settings";
import type { GeneralSettingsFormValues } from "@/features/settings/schema";

export function useUpdateCompanyMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      values,
      existingCompany,
    }: {
      values: GeneralSettingsFormValues;
      /** Every other key already in `company` (e.g. `timezone`, which this
       * form doesn't edit — the old frontend tracks it but never exposes a
       * control for it either) — spread first so this save only ever
       * changes the fields the form actually owns. */
      existingCompany: Record<string, unknown>;
    }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return settingsApi.updateCompany(workspaceId, {
        workspace_name: values.workspace_name,
        company: {
          ...existingCompany,
          company_name: values.workspace_name,
          phone_format: values.phone_format,
          currency: values.currency,
          language: values.language,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-settings", workspaceId] });
    },
  });
}
