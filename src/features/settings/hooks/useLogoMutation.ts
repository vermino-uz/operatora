import { useMutation, useQueryClient } from "@tanstack/react-query";

import { settingsApi } from "@/services/api/settings";

/** Upload → persist `company.logo_url` as one action (matches the old
 * frontend's flow: storage upload, then a separate `PUT .../company` with
 * the resulting URL — two real network calls, done here as one mutation so
 * a caller can't end up with an uploaded-but-unsaved file).
 *
 * `workspaceName` must be the real current top-level workspace name (from
 * the settings query), not read off `company.company_name` — that field is
 * only mirrored in after a General-settings save has happened at least
 * once, so deriving it from the company blob could send an empty string
 * and wipe the actual workspace name on a first-ever logo upload. */
export function useUploadLogoMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      workspaceName,
      existingCompany,
    }: {
      file: File;
      workspaceName: string;
      existingCompany: Record<string, unknown>;
    }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      const { url } = await settingsApi.uploadLogo(workspaceId, file);
      await settingsApi.updateCompany(workspaceId, {
        workspace_name: workspaceName,
        company: { ...existingCompany, logo_url: url },
      });
      return url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-settings", workspaceId] });
    },
  });
}

export function useRemoveLogoMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logoPath,
      workspaceName,
      existingCompany,
    }: {
      logoPath: string;
      workspaceName: string;
      existingCompany: Record<string, unknown>;
    }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      await settingsApi.removeLogo([logoPath]);
      const { logo_url: _removed, ...rest } = existingCompany;
      await settingsApi.updateCompany(workspaceId, {
        workspace_name: workspaceName,
        company: rest,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-settings", workspaceId] });
    },
  });
}
