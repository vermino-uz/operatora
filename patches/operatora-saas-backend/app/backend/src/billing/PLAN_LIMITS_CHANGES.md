# PlanLimitsService changes (Operatora-SaaS)

File: `app/backend/src/billing/plan-limits.service.ts`

## 1. BillableFeature / credit keys

Import credit helpers:

```ts
import {
  AI_FEATURE_KEYS,
  creditLimitKey,
  type AiCreditLimitKey,
} from './ai-model-pricing.catalog';
```

Include every `credits_*` key in whatever union/`BillableFeature` set drives `reserveUsage` / `incrementUsage`.

## 2. `incrementUsage` amount support

Change signature from:

```ts
async incrementUsage(workspaceId: string, feature: BillableFeature, delta = 1)
```

Ensure the SQL bump uses `usage_count = workspace_feature_usage.usage_count + $delta` (not hardcoded `+ 1`). Credits consume N at a time.

## 3. Add helpers used by AiCreditsService

```ts
async getNumericLimit(workspaceId: string, key: string): Promise<number | null> {
  const features = await this.getPlanFeaturesForWorkspace(workspaceId);
  const raw = features?.limits?.[key as keyof typeof features.limits];
  if (raw === undefined) return null;
  return raw as number | null;
}

async getUsageCount(workspaceId: string, key: string): Promise<number> {
  const periodKey = this.currentPeriodKey(); // existing YYYY-MM helper
  const row = await this.prisma.workspace_feature_usage.findUnique({
    where: {
      workspace_id_period_key_feature_key: {
        workspace_id: workspaceId,
        period_key: periodKey,
        feature_key: key,
      },
    },
    select: { usage_count: true },
  });
  return Number(row?.usage_count ?? 0);
}
```

(Adapt the unique constraint name to the real Prisma schema — today it's `(workspace_id, period_key, feature_key)`.)

## 4. Prefer credit meters when gating legacy features

When code still calls `reserveUsage(..., 'ai_chat_messages')`, either:

- migrate call sites to `AiCreditsService.assertCreditsRemaining('ai_chat')`, or
- inside `reserveUsage`, if `credits_ai_chat` is set on the plan, no-op the legacy unit reserve (credits path owns metering).

Same for `ai_inbox_summaries` → `credits_ai_inbox_recap` and `ai_lead_assist` → `credits_ai_lead_assist`.

## 5. Expose plan features including ai_feature_models

Ensure `getPlanFeaturesForWorkspace` merges DB `billing_plans.features.ai_feature_models` over catalog defaults (same merge pattern already used for channels / ai_chat_models).
