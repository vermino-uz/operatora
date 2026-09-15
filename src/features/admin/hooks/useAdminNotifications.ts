import { useMutation } from "@tanstack/react-query";
import { adminNotificationsApi } from "@/services/api/admin/notifications";
import type { SendNotificationInput } from "@/features/admin/types";

export function useSendAdminNotificationMutation() {
  return useMutation({
    mutationFn: (input: SendNotificationInput) => adminNotificationsApi.send(input),
  });
}

export function useUploadAdminNotificationImageMutation() {
  return useMutation({
    mutationFn: (file: File) => adminNotificationsApi.uploadImage(file),
  });
}
