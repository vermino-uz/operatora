# BillingModule registration (Operatora-SaaS)

In `app/backend/src/billing/billing.module.ts` (or wherever `PlanLimitsService` /
`AiUsageService` are provided):

1. Add providers:
   - `AiModelPricing` is a plain catalog — no provider needed
   - `AiFeatureConfigService`
   - `AiCreditsService`

2. Export `AiCreditsService` and `AiFeatureConfigService` so AI modules can inject them.

3. Ensure `PlanLimitsService` exposes (see `PLAN_LIMITS_CHANGES.md`):
   - `getNumericLimit(workspaceId, key)` including `credits_*`
   - `getUsageCount(workspaceId, key)`
   - `incrementUsage(workspaceId, key, amount = 1)`
   - `getPlanFeaturesForWorkspace(workspaceId)` returning `features.ai_feature_models`

4. Prefer credit keys at runtime; keep legacy invocation keys for rollback only.
