# Backend patch kit — Operatora-SaaS/operatora

This cloud agent only has write access to `vermino-uz/operatora` (new UI).
Copy these files into the NestJS monorepo and finish call-site wiring there.

## Files

| Patch path | Destination |
|---|---|
| `infra/postgres/migrations/0175_ai_feature_credits_models.sql` | `app/infra/postgres/migrations/` |
| `app/backend/src/billing/ai-model-pricing.catalog.ts` | `app/backend/src/billing/` |
| `app/backend/src/billing/ai-credits.service.ts` | `app/backend/src/billing/` |

## Manual integration steps (Operatora-SaaS)

1. **Extend `plan-features.catalog.ts`**
   - Add all `credits_*` keys to `NumericLimitKey` / `PlanLimits`.
   - Add `ai_feature_models: Partial<Record<AiFeatureKey, AiModelId>>` to `PlanFeatureSet`.
   - Deprecate `ai_chat_models` for gating (keep for rollback).

2. **`PlanLimitsService`**
   - Treat `credits_*` as billable features.
   - Make `incrementUsage(workspaceId, feature, amount = 1)` support `amount > 1`.
   - Expose `getNumericLimit` / `getUsageCount` used by `AiCreditsService`.
   - Prefer credit keys over legacy `ai_chat_messages` / `ai_inbox_summaries` / `ai_lead_assist` when present.

3. **Register `AiCreditsService`** in `BillingModule` providers/exports.

4. **Admin tariffs API** — ensure `GET/PUT /admin/tariffs` (or existing tariff endpoints) accept/return `limits.credits_*` and `features.ai_feature_models`. New UI calls:
   - `GET /admin/tariffs`
   - `PUT /admin/tariffs/:slug`

5. **Wire call sites** (assert → LLM with `getProviderModel` → `consumeCredits`):

| Feature | Primary files |
|---|---|
| `ai_chat` / `ai_ads_copilot` | `ai-chat/ai-chat.service.ts` — honor body `feature` |
| `ai_conversation` / `ai_lead_assist` | `ai-ext/handlers/ai-chat.service.ts` |
| `ai_inbox_recap` / `ai_agent_suggest` | `telegram-agentic/inbox-recap.service.ts`, suggest-reply |
| `ai_agent_reply` / `ai_agent_copilot` | `telegram-agentic.service.ts` / Instagram twin |
| `ai_ranker` | `signals-worker/signal-extractor.service.ts` |
| `ai_lead_distribution` | `ai-lead-distribution/*` |
| `ai_custom_dashboard` | `custom-dashboards/dashboard-ai.service.ts` |
| `ai_transcript` | `conversations-controllers/audio-upload/audio-processing.service.ts` |

6. **`GET /billing/me`** — include credit limits/usage + `ai_feature_models` (new UI already parses them).

7. Deploy with `[migrate]` so `0175` runs on test → beta → prod.

## Credit math

```
credits = max(1, ceil(usdCost * 100_000))  when tokens > 0
usdCost = inTok/1e6 * inputPer1M + outTok/1e6 * outputPer1M
```

Gating: assert remaining before call; consume actual after; overshoot allowed for that call only.
