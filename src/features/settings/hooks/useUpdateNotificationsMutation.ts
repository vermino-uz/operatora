import { useMutation, useQueryClient } from "@tanstack/react-query";

import { settingsApi } from "@/services/api/settings";
import type { NotificationsFormValues } from "@/features/settings/schema";

export function useUpdateNotificationsMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      values,
      existingNotifications,
    }: {
      values: NotificationsFormValues;
      /** Any other key already in the stored `notifications` blob (the old
       * frontend's rule-builder writes far more than these two flags) —
       * spread first so this save only ever changes the two toggles this
       * form actually owns. */
      existingNotifications: Record<string, unknown>;
    }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return settingsApi.updateNotifications(workspaceId, {
        ...existingNotifications,
        email_new_lead: values.email_new_lead,
        telegram_new_message: values.telegram_new_message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-settings", workspaceId] });
    },
  });
}
