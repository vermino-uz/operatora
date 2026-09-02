"use client";

import { useMutation } from "@tanstack/react-query";
import { authApi, type RequestOtpPayload } from "@/services/api/auth";

export function useRequestOtpMutation() {
  return useMutation({
    mutationKey: ["auth", "otp", "request"],
    mutationFn: (payload: RequestOtpPayload) => authApi.requestOtp(payload),
    retry: false,
  });
}
