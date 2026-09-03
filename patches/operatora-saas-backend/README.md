# Backend patch kit — Operatora-SaaS/operatora

This Cloud Agent VM only has `vermino-uz/operatora` (new UI). Copy these files into the NestJS monorepo on a host that has `Operatora-SaaS/operatora` (or `/www/wwwroot/test.operatora.ai`), then finish wiring and deploy with `[migrate]`.

## Drop-in files

| Patch path | Destination |
|---|---|
| `infra/postgres/migrations/0175_ai_feature_credits_models.sql` | `app/infra/postgres/migrations/` |
| `app/backend/src/billing/ai-model-pricing.catalog.ts` | `app/backend/src/billing/` |
| `app/backend/src/billing/ai-credits.service.ts` | `app/backend/src/billing/` |
| `app/backend/src/billing/ai-credits.math.spec.ts` | `app/backend/src/billing/` |
| `app/admin/src/hooks/useTariffs.ts` | `app/admin/src/hooks/` (replace) |
| `app/admin/src/pages/Tariffs.tsx` | `app/admin/src/pages/` (replace) |

## Merge guides

| Doc | Action |
|---|---|
| `app/backend/src/billing/plan-features.catalog.EXTENSION.ts` | Extend NumericLimitKey / PlanLimits / PlanFeatureSet |
| `app/backend/src/billing/PLAN_LIMITS_CHANGES.md` | `incrementUsage(amount)`, getNumericLimit/getUsageCount |
| `WIRE_CALL_SITES.ts` | Per-feature file map + assert→LLM→consume pattern |

## Integration checklist

1. Copy drop-in files.
2. Apply catalog + PlanLimitsService merges; register `AiCreditsService` in `BillingModule`.
3. Confirm admin tariff GET/PUT round-trip `limits.credits_*` + `features.ai_feature_models`.
4. Wire call sites from `WIRE_CALL_SITES.ts` (Phases 2–3).
5. Extend `GET /billing/me` with credit usage/limits + `ai_feature_models` (new UI already parses).
6. Commit message must include `[migrate]`; deploy test → beta → prod.

## Credit math

```
credits = max(1, ceil(usdCost * 100_000))  when tokens > 0
usdCost = inTok/1e6 * inputPer1M + outTok/1e6 * outputPer1M
```

Gating: assert remaining before call; consume actual after; overshoot allowed for that call only; next call fails until period reset.

## Already done in vermino-uz/operatora (this PR)

- Shared catalog + credit math + verify script
- Billing overview credit bars
- `/admin/tariffs` matrix (new UI)
- Model pickers hidden; Ads sends `feature: ai_ads_copilot`
