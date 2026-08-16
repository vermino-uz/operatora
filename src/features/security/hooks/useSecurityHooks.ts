import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { securityApi } from "@/services/api/security";

export function useSecuritySessionsQuery() {
  return useQuery({
    queryKey: ["security-sessions"],
    queryFn: () => securityApi.listSessions(),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      securityApi.changePassword(currentPassword, newPassword),
  });
}

export function useForceLogoutMutation() {
  return useMutation({
    mutationFn: () => securityApi.forceLogout(),
  });
}

export function useRequestPhoneOtpMutation() {
  return useMutation({
    mutationFn: (phone: string) => securityApi.requestPhoneOtp(phone),
  });
}

export function useConfirmPhoneChangeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, otpCode }: { phone: string; otpCode: string }) =>
      securityApi.confirmPhoneChange(phone, otpCode),
    onSuccess: () => {
      // The user's phone lives in `/auth/me`'s cached response.
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
