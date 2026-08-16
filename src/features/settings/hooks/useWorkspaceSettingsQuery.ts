import { useQuery } from "@tanstack/react-query";

import { settingsApi } from "@/services/api/settings";

export function useWorkspaceSettingsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-settings", workspaceId],
    queryFn: () => settingsApi.getWorkspaceSettings(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}
