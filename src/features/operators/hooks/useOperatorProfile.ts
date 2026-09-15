import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { operatorsApi } from "@/services/api/operators";

/** Get-or-create the `operators` table row for a profile — powers the
 * "Edit operator" dialog's internal-number field. 403s for a non-admin/
 * sales_manager caller surface via the normal `ErrorState`, matching
 * `EditOperatorDialog`'s real backend gate (this hook is only reachable
 * from a UI already gated to `MANAGER_ROLES`, but the backend remains
 * the real boundary either way). */
export function useOperatorProfileQuery(profileId: string | null, operatorName: string, enabled: boolean) {
  return useQuery({
    queryKey: ["operators-page", "operator-profile", profileId],
    queryFn: () => operatorsApi.getOrCreateProfile(profileId as string, operatorName),
    enabled: enabled && Boolean(profileId),
  });
}

export function useUpdateOperatorProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, internalNumber, operatorName }: { profileId: string; internalNumber: string; operatorName: string }) =>
      operatorsApi.updateProfile(profileId, { internalNumber: internalNumber || null, operatorName }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["operators-page", "operator-profile", variables.profileId] });
      void queryClient.invalidateQueries({ queryKey: ["operators-page", "operators"] });
    },
  });
}
