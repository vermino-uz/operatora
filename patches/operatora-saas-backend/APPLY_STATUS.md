# Apply status (2026-09-03)

## Host inventory

| Location | Result |
|---|---|
| `/www/wwwroot` on this Cloud Agent VM | **Missing** — path does not exist |
| `find …/plan-features.catalog.ts` on this VM | **0 hits** |
| GitHub `Operatora-SaaS/operatora` | **404** (not accessible with this token) |
| Other candidate NestJS repos under `vermino-uz/*` | **404** |
| Workspace repo | `/workspace` = `github.com/vermino-uz/operatora` (new UI only) |
| Self-hosted Cursor worker | Connected: `mail.aapanel.com` / display `/www/wwwroot/buypin-sample` — NestJS trees live there historically |

## What this kit contains (Phases 0–1 artifacts)

Drop-ins ready to copy onto a NestJS checkout:

- Migration `0175_ai_feature_credits_models.sql`
- `ai-model-pricing.catalog.ts`, `ai-credits.service.ts`, `ai-credits.math.spec.ts`
- Admin `Tariffs.tsx` + `useTariffs.ts` (credits matrix + single model select)

Merge guides (cannot be applied without the Nest tree):

- `plan-features.catalog.EXTENSION.ts`
- `PLAN_LIMITS_CHANGES.md`
- `BILLING_ME_CHANGES.md`
- `WIRE_CALL_SITES.ts`

## Blocked

- **Migration not run** — no Postgres / Nest deploy host in this VM.
- **Call-site wiring incomplete** — requires reading live `AiUsageService` / `PlanLimitsService` patterns under `/www/wwwroot/*/app/backend` (do not invent).
- **`GET /billing/me` remaining credits** — not verifiable until Nest is patched.
- **Unit tests in Nest Jest** — math verified here via `npm run verify:ai-credits` on the UI catalog; Nest `*.spec.ts` needs the backend test runner.

## Unblock

Re-run this work **on the self-hosted worker** (or any host with `/www/wwwroot/test.operatora.ai` or `dev.operatora`), then:

1. Prefer `test.operatora.ai` / staging checkout if multiple exist.
2. Copy drop-ins, apply merge guides, register `AiCreditsService`.
3. Wire all 12 features from `WIRE_CALL_SITES.ts`.
4. Commit on Nest branch with `[migrate]` and deploy test → beta → prod.
