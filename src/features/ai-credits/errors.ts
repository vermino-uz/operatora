import { ApiError } from "@/types/api";

/** User-facing message for AI credit / plan gating errors. */
export function aiCreditsErrorMessage(error: unknown, fallback = "AI request failed."): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback;
  }
  if (error.isAiFeatureDisabled) {
    return error.message || "This AI feature is not included in your plan.";
  }
  if (error.isAiCreditsExhausted || error.isPaymentRequired) {
    return error.message || "Monthly AI credits for this feature are exhausted. Credits reset next period.";
  }
  if (error.code === "plan_limit") {
    return error.message || "Plan limit reached for this AI feature.";
  }
  return error.message || fallback;
}
