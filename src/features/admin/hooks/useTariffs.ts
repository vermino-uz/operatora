"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminTariffsApi,
  type AdminPlanFeatures,
  type AdminPlanLimits,
  type TariffPlan,
} from "@/services/api/adminTariffs";

export function useTariffsQuery() {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => adminTariffsApi.list(),
    staleTime: 30_000,
  });
}

export function useUpdateTariffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "plans", "update"],
    mutationFn: (params: {
      slug: string;
      limits?: Partial<AdminPlanLimits>;
      features?: Partial<AdminPlanFeatures>;
    }) => adminTariffsApi.update(params.slug, { limits: params.limits, features: params.features }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
}

export type { TariffPlan };
