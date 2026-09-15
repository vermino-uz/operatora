import { apiFetch } from "@/services/api/client";
import type { AiModelPricingRow, TariffPlan, UpdatePlanPayload } from "@/features/admin/types";

/**
 * `/admin/plans/*` + `/admin/ai-model-pricing` — confirmed against
 * `admin-plans.controller.ts` / `admin-ai-model-pricing.controller.ts`.
 */
export const adminPlansApi = {
  list(): Promise<{ plans: TariffPlan[] }> {
    return apiFetch<{ plans: TariffPlan[] }>("/admin/plans");
  },
  update(slug: string, patch: UpdatePlanPayload): Promise<TariffPlan> {
    return apiFetch<TariffPlan>(`/admin/plans/${encodeURIComponent(slug)}`, { method: "PATCH", body: patch });
  },
  pricing(): Promise<{ pricing: AiModelPricingRow[] }> {
    return apiFetch<{ pricing: AiModelPricingRow[] }>("/admin/ai-model-pricing");
  },
  updatePricing(pricing: AiModelPricingRow[]): Promise<{ pricing: AiModelPricingRow[] }> {
    return apiFetch<{ pricing: AiModelPricingRow[] }>("/admin/ai-model-pricing", {
      method: "PUT",
      body: { pricing },
    });
  },
};
