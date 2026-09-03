# GET /billing/me — expose AI credits + fixed models

File: `app/backend/src/billing/billing.service.ts` (or wherever `me()` / `getWorkspaceBilling` builds the payload for `BillingController`).

New UI (`src/services/api/billing.ts`) already parses:

- `limits.credits_<feature>` (number | null)
- `usage.credits_<feature>` (number — period usage count)
- `ai_feature_models` (Partial\<Record\<AiFeatureKey, AiModelId\>\>)

## Merge into the me() response builder

```ts
// After existing limits/usage merge from PlanLimitsService:

const creditRemaining = await this.aiCredits.remainingForWorkspace(workspaceId);
const plan = await this.planLimits.getPlanFeaturesForWorkspace(workspaceId);

// Flatten into limits + usage shapes the UI expects:
for (const [key, row] of Object.entries(creditRemaining)) {
  // key is credits_ai_chat etc.
  limits[key] = row.limit;
  usage[key] = row.used;
}

return {
  ...existing,
  limits,
  usage,
  ai_feature_models:
    plan?.features?.ai_feature_models ?? DEFAULT_AI_FEATURE_MODELS,
};
```

## Notes

- Prefer reusing `AiCreditsService.remainingForWorkspace` rather than duplicating period-key logic.
- Keep legacy keys (`ai_chat_messages`, `ai_inbox_summaries`, `ai_lead_assist`) in the payload for rollback UIs; credit keys take precedence in the new frontend Overview bars.
- Null limit = unlimited; omit or send `null` (UI treats null as unlimited).
