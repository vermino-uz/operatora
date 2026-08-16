# Operatora Frontend Rebuild — Architecture Report

Prepared by: architect session, 2026-08-12
Scope: (1) findings from inspecting the old system at `/www/wwwroot/dev.operatora` (read-only reference), (2) proposed architecture for the new frontend at `/www/wwwroot/new.operatora.ai`.

---

## PART 1 — OLD SYSTEM INSPECTION

Codebase root inspected: `/www/wwwroot/dev.operatora` (not modified). App code lives under `app/`; no root `package.json`.

### Tech Stack

- **Main frontend**: React 18 + TypeScript + Vite, Tailwind + shadcn/ui, React Router v6, TanStack Query/Table, i18next. Source: `app/src/`, dev port 8080.
- **Super-admin frontend**: separate React + Vite app, `app/admin/src/`, dev port 8081, deployed at `/console/`.
- **Backend**: NestJS 10, Prisma 6 ORM + raw `pg` where needed, PostgreSQL 15, Socket.io 4, BullMQ + Redis. Source: `app/backend/src/`, global prefix `/api` (`app/backend/src/main.ts:12` — `app.setGlobalPrefix("api")`), port 3030.
- **API style**: REST via NestJS controllers, plus one generic RPC/Postgrest-style "DB proxy" endpoint (`POST /api/db/:table/query`) kept for legacy frontend code that still speaks Supabase's query shape.
- **Sidecar**: Python (Pyrogram + FastAPI) Telegram userbot worker, `app/services/telegram-account/`, run under PM2, port 8091, invoked only by the NestJS `telegram-account/` module via an internal `X-Internal-Key` header.
- **Separate legacy admin**: a Laravel Filament PHP app at repo-root `admin/` (`manage.operatora.xyz/admin`) — a distinct stack, not in scope for this frontend rebuild.
- **AI providers**: OpenAI (GPT-4o-mini + Whisper), Gemini, Anthropic — keys in `app/backend/.env.example`.
- **Billing**: Payme/Click (legacy UZ), Paylov, Apple IAP.
- **Migrations**: numbered raw SQL files (`app/infra/postgres/migrations/000N_*.sql`), additive/expand-contract only, tracked in `_sql_migration_history`; Prisma schema synced afterward.
- **Historical note — Supabase migration debt**: the app was migrated off Supabase to self-hosted Postgres/NestJS. Two compat shim layers keep ~57 legacy files working: frontend `app/src/lib/dbshim/` (routes `auth→/api/auth/*`, `from()→/api/db/*`, `storage→/api/storage/*`, `functions→/api/functions/*`) and backend `app/backend/src/lib/supabase-compat/`. **New code must not add `@supabase/supabase-js` and should talk to the backend directly** — this is explicit guidance in the old repo's `CLAUDE.md`, and it applies doubly to a from-scratch rebuild: target the plain REST/DTO endpoints and JWT/RolesGuard patterns, not the `/api/db/*` proxy shape.

### Pages/Routes (old system — for behavioral parity reference, not to copy UI)

Main app router: `app/src/App.tsx`.

- Public: `/form/:formId`, `/board/:token`, `/privacy`, `/privacy-policy`, `/terms`, `/terms-of-use`, `/refund`, `/refund-policy`, `/doc`, `/design-system`, OAuth callback routes (Instagram/Google Sheets/Google Calendar/Ads), `/extension-connect`.
- Auth-adjacent: `/auth`, `/pricing`, `/signup`, `/checkout`, `/welcome`, `/operatora/success`.
- Protected (behind `AuthProvider > WorkspaceProvider > WorkspacePermissionsProvider > ProtectedRoute > DashboardLayout`, each further gated by `<ProtectedRoute requirePage="...">`): `/` (Dashboard), `/conversations`, `/messages`, `/operators`, `/operator-feedbacks`, `/instructions`, `/social-media-advisor`, `/leads`, `/tasks`, `/dashboards`, `/gallery`, `/ads`, `/forms`, `/finance`, `/workspaces` (admin-only), `/settings`, `/instagram-settings` (admin-only).

Admin app router: `app/admin/src/App.tsx`, mounted at `/console/`, behind `AdminAuthGuard`: overview, `workspaces`, `workspaces/:id/*`, `users`, `users/:id`, `conversations`, `ai-usage`, `integrations`, `billing`, `tariffs`, `feedback`, `audit-logs`, `system`, `notifications`.

### API Endpoints (sampled, with evidence)

Confirmed via controller reads and `app/backend/docs-backend/API_GUIDE.md`.

- `POST /api/auth/login` — `{email|phone, password}` → sets httpOnly cookies (`access_token`, `refresh_token`, `acct_rt_<userId>`); returns `{user, roles, workspaceId, access_token}`. Throttled 5/min/IP.
- `POST /api/auth/register` — creates account + workspace (14-day trial), 201, same session shape.
- `POST /api/auth/refresh` — rotates refresh token, returns `{user, roles, access_token}`.
- `POST /api/auth/logout` — 204, revokes token, clears cookies.
- `GET /api/auth/me` — current user + roles + workspaceId.
- `POST /api/auth/switch`, `DELETE /api/auth/switch/:userId` — multi-account device switching.
- `GET /api/check-user-role/me` — legacy uniform "me" endpoint: `{user, roles, isSuperAdmin, isAdmin, canEdit}`.
- `POST /api/db/:table/query` — generic Supabase-compat proxy (legacy only, JWT-guarded).
- Leads: `POST/GET /api/leads`, `GET/PATCH/DELETE /api/leads/:id`, `POST /api/leads/:id/restore`, `DELETE /api/leads/:id/permanent`, `GET/POST/PATCH/DELETE /api/leads/:id/phones[/:phoneId]`.
- `GET /api/leads-list?boardId=&page=&pageSize=&filters=&selectedColumns=` → `{data: leads[], count, conversationCounts}`.
- `GET /api/lead-board/:boardId/leads?search=&customFields=&assignedOperator=&columnId=&page=` → `{leads: [], totalCount, page, perPage}`.
- Billing: `GET /api/billing/plans|usage|invoices[/:id]|current-plan|me|balance`, `POST /api/billing/operator-seat/rent|cards`, `POST /api/billing/paylov/invoice` (20 endpoints total, `billing.controller.ts`).
- AI chat: `POST /api/ai-chat/v2`, `POST /api/ai-chat/feedback`, `GET /api/ai-chat/telemetry|health|models`.
- Storage: `POST /api/storage/:bucket/upload|remove`, `GET /api/storage/:bucket/list`, `POST /api/storage/:bucket/signed-url`, `GET /api/storage/:bucket/download`, plus unauthenticated signature-verified `GET /api/storage/:bucket/public/*` and `/signed/*`.
- `POST /api/audio-upload` — multipart, creates a conversation record.
- `POST /api/mcp` — MCP server endpoint for external AI clients; `workspace_id` is always derived from the authenticated key, never client-supplied (a pattern worth preserving: never trust a client-supplied tenant id).
- Health: `GET /api/public/health`. Swagger at `/api/docs`, disabled in production (`ENABLE_SWAGGER=false`).

Standard error envelope (NestJS default):
```json
{ "statusCode": 401, "message": "Unauthorized", "error": "Unauthorized" }
```

### Auth & Authorization

JWT-based (`app/backend/src/auth/`). Access token payload:
```ts
interface JwtPayload {
  sub: string; email: string | null; roles: string[]; workspaceId?: string;
  impersonatedBy?: string; impersonatorEmail?: string;
  sid?: string;  // mobile single-session id
  wsid?: string; // web single-session id
}
```
- Web clients: httpOnly cookies (`access_token`, `refresh_token`, plus `acct_rt_<userId>` per linked account for multi-account switching), `sameSite: lax`. Mobile/desktop: `Authorization: Bearer <JWT>`.
- Passport strategy `'jwt-v2'`: header first, cookie fallback; verification pinned to `algorithms: ['HS256']` explicitly (hardened against algorithm-confusion).
- **Single-session enforcement**: web sessions carry `wsid`, mobile carry `sid` (max 2 devices, LRU eviction); a superseded token throws `SESSION_SUPERSEDED`, which the old frontend's fetch wrapper detects and force-logs-out on. **The new frontend must replicate this behavior** — treat `SESSION_SUPERSEDED` (or whatever the new error `code` is) as a forced-logout signal, not a generic 401 retry.
- Refresh tokens stored hashed (SHA-256) with `expires_at/revoked_at/replaced_by` rotation chain — never raw.
- `JwtAuthGuard` respects a `@Public()` decorator for route-level auth bypass. `RolesGuard` checks `user.roles.some(r => required.includes(r))` → `ForbiddenException` otherwise.
- Login/register/OTP/reset are rate-limited (`AuthThrottlerGuard`, e.g. 5 login attempts/min/IP).
- WebSocket auth mirrors REST: JWT read from `handshake.auth.token` or Authorization header, same HS256 verification, disconnect on failure.

### Roles & Permissions

- Global RBAC: Prisma enum `app_role` = `admin, moderator, user, sales_manager, operator, demo_admin, finance_manager, marketing_agent, super_admin`, stored in `user_roles (user_id, role)` — a user can hold multiple roles.
- Workspace-scoped layer: `workspace_users (workspace_id, user_id, role string default "member", permissions Json, invited_by)` — a **second**, per-tenant role/permission dimension distinct from the global enum.
- Role groupings reused across backend (`app/backend/src/db-proxy/table-registry.ts`):
```ts
const ADMIN_ROLES = ['admin', 'demo_admin', 'super_admin'];
const MANAGER_ROLES = [...ADMIN_ROLES, 'sales_manager'];
const ALL_APP_ROLES = [...MANAGER_ROLES, 'operator', 'finance_manager'];
```
- Enforcement is name-based RBAC (not attribute-based), applied two ways: `@Roles()` decorator + `RolesGuard` on NestJS routes, and per-table `readRoles`/`writeRoles` arrays in the DB-proxy registry.
- **Implication for new frontend**: permission checks must be driven off `roles[]` (global) AND workspace membership `role`/`permissions` (tenant-scoped) returned by `/api/auth/me` — a single flat "isAdmin" boolean is not sufficient; a permissions helper/hook needs both dimensions.

### Workspace/Company Structure

Multi-tenant; tenant unit is a **workspace** (not "company"). `workspaces` model: `id, name, slug, owner_id, settings Json, subscription_tier, subscription_status, extra_operator_seats, trial_ends_at, suspended_at, total_input_tokens/output_tokens/total_tokens`.

Scoping is **application-level, not Postgres RLS** (explicit in old `CLAUDE.md`: "Security is application-level, not RLS"). Central mechanism: `table-registry.ts` assigns every proxy-accessible table an `AccessScope`:
```ts
type AccessScope = 'workspace' | 'user' | 'profile' | 'global';
```
- `workspace` → filtered by `jwt.workspaceId`; `user` → `jwt.sub`; `profile` → profile id; `global` → open, often narrowed by `membershipScope` (must belong to the workspace via `workspace_users`).
- Feature controllers (leads, billing, storage) re-derive `workspaceId` from the JWT server-side rather than accepting it as a client parameter. **New frontend implication: never send `workspace_id` as a request body/query param expecting it to scope data — the backend derives it from the token; the frontend only needs it for display/switching UI and for the `x-workspace-id`-style header if the new backend endpoints require one (verify per-endpoint).**
- Storage buckets with `pathScope: 'workspace'` require the object path to start with `${workspaceId}/`.

### Data Entities & Relationships

Source: `app/backend/prisma/schema.prisma` (~102 models). Key entities:

- `users` (legacy identity) / `app_users` (auth identity: `password_hash`, `failed_login_count`, `locked_until`), 1:1.
- `profiles` — 1:1 with `users`, PII, relations to `operators`, `groups`, `payments`.
- `workspaces` — tenant root; near-universal back-relations.
- `workspace_users` — tenant membership + role + permissions Json.
- `user_roles` — global RBAC pairs.
- `leads` — `first_name, last_name, phone_number, custom_fields Json, column_id, display_order, assigned_operator_id, archived, deadline, sold, workspace_id`; relates to `leads_columns`, `operators`, `lead_comments`, `form_submissions`, `telegram_chats`, `instagram_conversations`.
- `leads_boards → leads_columns → leads` — Kanban pipeline hierarchy; boards support public sharing (`share_token`, `share_password_hash`, `share_expires_at`).
- `conversations` — call/chat analytics: `ai_score, sentiment, transcript Json, key_points, topics, compliance_flags, disposition`.
- `operators` — links `profiles` to workspace operator status; referenced by `leads.assigned_operator_id`.
- `subscription_orders`, `apple_iap_transactions` — billing.
- `telegram_*` / `instagram_*` tables — omnichannel messaging, workspace-scoped.
- `sms_*` tables — SMS marketing.
- `notifications`, `user_mentions`, `audit_logs`, `platform_settings`.
- `refresh_tokens`, `password_reset_tokens`, `auth_otp_codes`.

**Gap worth flagging**: there is **no dedicated `tasks` Prisma model**. `task_management_logika.md` (Uzbek) describes an aspirational task-management design (SLA-driven auto-tasks, KPI formula, overdue-blocking lead distribution) with no corresponding backend table yet. The old frontend's `/tasks` route likely repurposes `leads.deadline` + comments. **Do not treat the old `/tasks` UI as a stable contract to mirror 1:1** — confirm with backend/product whether a real tasks entity now exists or is planned before building that screen.

### WebSocket/Realtime

Socket.io 4, gateway `app/backend/src/realtime/realtime.gateway.ts`:
```ts
@WebSocketGateway({ namespace: '/', cors: { origin: true, credentials: true }, transports: ['websocket'] })
```
- Auth on connect via JWT in `handshake.auth.token` or header; disconnects on failure.
- Client events: `presence:heartbeat`, `activity:ping`, `subscribe`/`unsubscribe` (topic rooms gated by `ALLOWED_PREFIXES = ['user_notifications:', 'workspace:', 'tg-channel:', 'messages:']` plus ownership checks).
- Server emits: `emitToTopic(topic, payload)` → `channel:${topic}` event on the room, e.g. `presence_changed` on `workspace:{id}`.
- Feature-specific gateways for Telegram/Instagram/SMS/Eskiz push new-message/delivery-status events.
- Old frontend proxies `/socket.io` in dev (`vite.config.ts`); prod uses `VITE_WS_URL`.

### File Uploads

Two patterns:
1. **Generic storage proxy** (`storage-proxy/storage.controller.ts`, JWT-guarded): upload/remove/list/signed-url/download, plus unauthenticated signature-verified public/signed GET routes (HMAC, time-limited, HTTP Range support for audio/video seeking). Backend is **local disk** (`fs.writeFile` under `STORAGE_PATH`), not S3. Buckets have explicit constraints (`buckets.ts`): `conversations` (audio ≤200MB), `avatars` (images ≤5MB, magic-byte check), `feedback-screenshots` (≤5MB), `generated-media` (≤25MB, workspace-path-scoped), `product-files`. Workspace-scoped buckets require path to start with `${workspaceId}/`.
2. **Feature-specific multer uploads**, e.g. `POST /api/audio-upload` (100MB, audio-only, temp disk storage) and similar patterns in telegram-agentic, instagram-agentic, app-feedback, group-chat, generated-media, brand, leads-comments, leads-import, meet-recordings controllers.

### Pagination/Filtering/Sorting

Two conventions coexist in the old API — **the new frontend's API layer should normalize both into one internal shape** rather than assuming consistency:
- `page`/`pageSize` (or `perPage`) with `{data, count}` or `{leads, totalCount, page, perPage}` envelopes (1-based page index).
- Bare-array offset-style (e.g. `GET /api/get-board-pagination?boardId=&limit=`) with no envelope.
- The generic DB proxy supports Postgrest-style `limit/offset/range/order/count` and filter objects `{column, op, value}` — legacy-only, not to be extended.
- Complex query params (`filters`, `customFields`, `selectedColumns`) are often JSON-stringified in the query string and parsed server-side, rather than flat params.

### Error Handling Conventions

Centralized `AllExceptionsFilter` (`app/backend/src/common/filters/all-exceptions.filter.ts`, registered via `app.useGlobalFilters`):
- `HttpException`s pass through status+message; anything else forced to 500 `"Internal server error"` — raw DB errors never reach the client.
- Envelope:
```json
{ "statusCode": 400, "message": "...", "timestamp": "...", "path": "/api/leads/123" }
```
- Handlers can attach custom fields (`code`, `feature`, `upgradeTo` for plan-limit errors) that get spread into the body — frontend should branch on these where present.
- Status codes: 200/201/400/401/403/404/500 (documented, standard usage).
- `ValidationPipe({ transform: true })` globally applied **without** `whitelist: true` (legacy DTOs lack decorators) — a known debt; not something to replicate in new frontend assumptions, but be aware some old endpoints may silently accept extra body fields.

### API Base URL / Env Config

- All routes under `/api` prefix.
- Old frontend env: `VITE_BACKEND_PORT` (`/api` behind nginx, or `http://localhost:3030` local), `VITE_USE_DB_SHIM`, `VITE_WS_URL`, legacy `VITE_SUPABASE_*`.
- Backend env: `DATABASE_URL`, `JWT_SECRET`/`JWT_EXPIRES_IN=15m`, `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN=30d`, `PORT`, `FRONTEND_ORIGINS` (CORS allowlist), `PUBLIC_BACKEND_URL`, `STORAGE_PATH`, integration secrets, `SUPER_ADMIN_EMAILS`.
- **Environment/domain matrix** (git branch → subdomain → port → DB):

| Env | Branch | URL | Port | DB | Deploy |
|---|---|---|---|---|---|
| test | `test` | test.operatora.ai | 3031 | `operatora_test` (throwaway) | auto on push |
| beta | `beta` | beta.operatora.ai | 3030 | `operatora` (shared w/ prod) | manual |
| prod | `main` | operatora.ai | 3032 | `operatora` (shared w/ beta) | manual |

This confirms the pattern the new frontend must follow: **a single build, base API URL selected purely by env var** (`VITE_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` = `https://test.operatora.ai/api` or `https://operatora.ai/api`), no hardcoded domain branching in code. Health check: `GET /api/public/health`.

### Sampled files (evidence trail)

Docs: `README.md`, `CLAUDE.md`, `AGENTS.md`, `task_management_logika.md`, `app/backend/docs-backend/API_GUIDE.md`, `app/backend/docs-backend/leads-board-filters-endpoints.md`.
Backend: `app/backend/src/main.ts`, `auth/auth.controller.ts`, `auth/auth-tokens.service.ts`, `auth/guards/jwt-auth.guard.ts`, `auth/guards/roles.guard.ts`, `db-proxy/db-proxy.controller.ts`, `db-proxy/table-registry.ts`, `realtime/realtime.gateway.ts`, `storage-proxy/storage.controller.ts`, `storage-proxy/buckets.ts`, `common/filters/all-exceptions.filter.ts`, `prisma/schema.prisma`, `.env.example`, plus `leads-controller/leads/leads.controller.ts`, `billing/billing.controller.ts`, `ai-chat/ai-chat.controller.ts`.
Frontend: `app/src/App.tsx`, `app/admin/src/App.tsx`, `app/src/integrations/supabase/client.ts`, `app/src/lib/dbshim/{index,http,table-query,auth}.ts`, `app/src/lib/authenticatedFetch.ts`, `app/admin/src/lib/adminFetch.ts`, `app/.env.example`, `app/vite.config.ts`, `app/src/i18n/index.ts`, `app/src/pages/{Leads,Auth,Dashboard}.tsx`, `app/src/components/layout/app-page/AppPage.tsx`.

**Key debt to NOT replicate**: Supabase-compat shims (frontend `dbshim`, backend `supabase-compat`), non-whitelisted global `ValidationPipe`, two coexisting pagination envelope shapes. The old repo's own `CLAUDE.md` instructs against extending the shim further — treat the plain REST/DTO endpoints as the real contract.

---

## PART 2 — PROPOSED NEW FRONTEND ARCHITECTURE

Governing rules (restated): old code is read-only reference only; reuse the existing NestJS backend as-is (no new backend); UI/UX may be fully redesigned but permissions/business behavior must stay compatible with what's documented above; use HeroUI wherever appropriate; component-based architecture with shared reusable primitives; strict TypeScript; correct state boundaries; strong network-flood prevention and offline/error handling; deploy under PM2 with a production build.

### Recommended Stack (confirmed via web search, Aug 2026)

| Concern | Choice | Version (confirmed) | Rationale |
|---|---|---|---|
| Framework/build | **Next.js, App Router, `output: standalone`** | 16.3.0 (npm, Aug 2026) | Runs as a plain long-lived Node process under PM2 (`node server.js`), not Vercel-locked. Gives file-based routing, SSR/streaming for dashboard-heavy screens, route-level code splitting, image/font optimization — all useful for an auth-gated multi-page workspace app. Vite+React Router remains a valid fallback for a pure SPA, but Next.js's SSR/streaming is a net win here and PM2 support for a standalone Next server is standard. |
| UI components | **HeroUI (`@heroui/react`)** | v3.2.3 (npm, last published days before check) | Explicit project requirement; actively maintained (v3 is a July-2026 ground-up rewrite on Tailwind v4 + React Aria Components 1.17), React 19/Next 16 compatible. **Must pin Tailwind v4**, not v3, since HeroUI v3 depends on it. |
| Server state / data fetching | **TanStack Query (`@tanstack/react-query`)** | v5.101.4 | This is the primary network-flood-prevention mechanism: identical in-flight `queryKey` requests are deduped automatically; `AbortSignal` is wired into `queryFn` so navigating away/changing params cancels obsolete requests; `staleTime`/`gcTime` avoid redundant refetches; mutation retry/backoff is built in. Avoids hand-rolled fetch-loop bugs. |
| Global client state | **Zustand** | v5.0.14 | Minimal boilerplate vs Redux Toolkit; single-store model fits "workspace/session/UI-shell" global concerns (active workspace, sidebar, theme, feature flags) better than Jotai's atom-per-value model for this app's shape. Explicitly scoped to UI/session state only — server data never lives here (see State Boundaries below). |
| Forms & validation | **React Hook Form + Zod (+ `@hookform/resolvers`)** | RHF 7.66+, Zod 4.1+, resolvers 5.2+ | Uncontrolled-input model performs well for large forms (lead forms, settings); `Controller` bridges cleanly to HeroUI's non-native-input components; Zod schema doubles as the single source of truth for both validation and TS types generated from backend DTOs. |
| Tables | **TanStack Table (headless) rendered through HeroUI Table primitives** | `@tanstack/react-table` v9.1.2 | Old API's `page/pageSize` server-driven pagination (leads list, board views) maps directly to TanStack Table's `manualPagination`/`manualSorting`/`manualFiltering` mode; HeroUI's native table lacks that server-driven state logic on its own. |
| Routing | Next.js App Router file-based routing | — | No separate router needed; route groups + parallel/intercepting routes handle the protected-tree/public-tree split cleanly (mirrors old `AuthProvider > WorkspaceProvider > ProtectedRoute` nesting via layouts). |
| Realtime client | **`socket.io-client`** (backend already speaks Socket.io 4) paired with TanStack Query cache updates | — | Don't duplicate server state in a separate realtime store: socket events call `queryClient.invalidateQueries` or `setQueryData` directly. Matches the old backend's `RealtimeGateway`/topic-room model (`workspace:{id}`, `user_notifications:{id}`, etc.) with zero backend changes needed. |
| Language | TypeScript, `strict: true` | — | Explicit requirement; also lets Zod-inferred types and backend DTO types flow end-to-end. |

### State Boundaries (explicit, since "don't dump everything into global state" was a stated rule)

- **Server state** — all data owned by the backend (leads, conversations, billing, workspaces, users): TanStack Query only. Never mirrored into Zustand.
- **Global client state** (Zustand) — cross-page UI/session concerns that aren't server data: active workspace id (selected, not fetched), sidebar collapsed/expanded, theme, feature-flag overrides, realtime connection status. Kept intentionally small.
- **URL state** — anything that should survive refresh/be shareable/be back-button-able: table page/pageSize/sort/filter params, selected board/column id, active tab. Use Next.js `useSearchParams`/`router.replace` (or `nuqs` if query-param ergonomics need it — optional, add only if plain `useSearchParams` proves noisy).
- **Form state** — React Hook Form's internal state; only committed to server state via a mutation on submit, never synced into Zustand mid-edit.
- **Local component state** — `useState`/`useReducer` for purely presentational concerns (modal open/closed, hover, local optimistic UI not worth a query mutation).

### Network-Flood Prevention (concrete mechanisms, not generic advice)

- TanStack Query: dedupe by `queryKey` (identical in-flight requests collapse to one call), `AbortSignal`-based cancellation on unmount/key change, `staleTime` tuned per data type (see caching table below), `retry` with exponential backoff capped at e.g. 3 attempts, disabled on 4xx.
- A single centralized `fetch` wrapper (see API layer below) — no component is allowed to call `fetch`/`axios` directly, preventing ad-hoc uncontrolled request patterns.
- Debounce search/filter inputs (e.g. leads board search) at the input layer (~300ms) before they become query-key changes, so keystrokes don't each fire a request.
- Realtime-triggered refetches go through `invalidateQueries`, which itself is deduped/batched by TanStack Query — a burst of socket events doesn't become a burst of duplicate fetches.
- Auth refresh: a single in-flight refresh promise shared across all 401-triggered retries (mutex pattern) so N concurrent 401s don't fire N refresh calls — mirrors the old backend's single-session/refresh-rotation model and avoids a refresh-token race.
- Mutations use `mutationKey` + `retry: false` by default (idempotency isn't guaranteed backend-side for many old endpoints), with explicit opt-in retry only for known-idempotent calls.

### Proposed Folder Structure

Sized for a project that hasn't started yet — flat where possible, room to grow by feature, not pre-split into 20 empty folders.

```
src/
  app/                        # Next.js App Router routes
    (public)/                 # marketing/public pages: /pricing, /privacy, /terms, /form/[formId], /board/[token]
    (auth)/                   # /login, /signup, /welcome — own layout, no protected shell
    (protected)/              # authenticated app shell (layout enforces auth+workspace+permissions)
      dashboard/
      leads/
      conversations/
      operators/
      billing/
      settings/
      workspaces/             # admin-only, permission-gated at layout level
      ...                     # one folder per old top-level route, added as each is scoped
    api/                       # Next.js route handlers ONLY if a BFF proxy/token-refresh endpoint is needed; otherwise omit
  components/
    ui/                       # thin wrappers/compositions over HeroUI primitives (Button, Input, Modal, Table, etc.)
    shared/                   # cross-feature composites: EmptyState, ErrorState, LoadingState, DataTable, ConfirmDialog, FormField
    layout/                   # AppShell, Sidebar, Topbar, WorkspaceSwitcher
  features/                   # one folder per business feature, colocated
    leads/
      components/
      hooks/                  # useLeadsQuery, useLeadMutation, etc.
      api.ts                  # feature-scoped service functions built on the shared client
      schema.ts               # Zod schemas + inferred types for this feature
    conversations/
    billing/
    ...
  services/
    api/
      client.ts                # centralized fetch wrapper (base URL, auth headers, error normalization)
      auth.ts                  # login/refresh/logout calls + the shared-refresh-mutex
      endpoints/                # thin per-domain endpoint functions (leads.ts, billing.ts, ...) if not colocated under features/
    realtime/
      socket.ts                 # socket.io client singleton, connect/auth/reconnect logic
      subscriptions.ts          # topic subscribe/unsubscribe helpers, maps events -> queryClient invalidations
  state/
    workspace-store.ts          # Zustand: active workspace, session/UI state
    ui-store.ts                 # Zustand: sidebar/theme/etc.
  hooks/                        # generic cross-feature hooks (useDebounce, useMediaQuery, usePermission)
  auth/
    permissions.ts               # role/permission helper built from /api/auth/me shape (global roles[] + workspace role/permissions)
    guards.tsx                   # <RequireRole>, <RequirePermission>, route-layout guards
  types/
    api.ts                       # shared response/error envelope types
    entities.ts                  # domain types (Lead, Workspace, User, ...) — hand-written or generated from backend DTOs if OpenAPI/Swagger becomes available
  constants/
    routes.ts, roles.ts, buckets.ts (storage bucket names/limits mirrored from backend)
  utils/
    formatting.ts, dates.ts, files.ts
  validation/
    common-schemas.ts            # shared Zod primitives (phone, email, pagination params)
  config/
    env.ts                       # typed, validated env access (API base URL, WS URL, etc.)
public/
```

Notes:
- `features/` vs `components/` split keeps business logic (leads, billing) separate from generic reusable UI (buttons, tables, empty states) — mirrors "component-based architecture with shared reusable components" requirement without over-engineering into a full DDD layout.
- No `services/` top-level split into 10 sub-services on day one; add per-domain files under `services/api/endpoints/` as features are actually built.
- `admin` console (old `/console/`) can be a route group (`app/(admin)/`) within the same app rather than a second deployable, unless there's a hard reason (separate deploy cadence, separate auth) to keep it split as the old system did — worth a deliberate decision before Phase 2, not assumed here.

### API/Service Layer Contract

- **Env-based base URL**: `NEXT_PUBLIC_API_BASE_URL` (e.g. `https://test.operatora.ai/api` / `https://operatora.ai/api`) and `NEXT_PUBLIC_WS_URL`, read once through `config/env.ts` with a runtime check (fail fast if unset) — no hardcoded domains anywhere else, matching the old system's env-driven test/beta/prod split.
- **Centralized auth handling**: one `apiFetch()` wrapper (`services/api/client.ts`) that (a) attaches credentials (cookie-based, matching old httpOnly cookie auth — confirm with backend whether the new frontend also gets cookie auth or must use Bearer; either way, single place to change), (b) on 401 triggers the shared single-flight refresh-then-retry, (c) on a `SESSION_SUPERSEDED`-equivalent code forces logout + redirect, not a retry loop.
- **Centralized error normalization**: wrapper always returns/throws a single internal `ApiError { statusCode, message, code?, path?, timestamp }` shape derived from the backend's `AllExceptionsFilter` envelope, regardless of which of the old system's two pagination/response shapes the endpoint uses — feature code never branches on raw fetch/axios errors.
- **Pagination normalization**: a small adapter per endpoint (or per legacy response shape) that maps `{data,count}` / `{leads,totalCount,page,perPage}` / bare-array responses into one internal `{items, total, page, pageSize}` shape consumed uniformly by the shared `DataTable` component — isolates the old API's inconsistency behind one seam instead of leaking it into every feature.
- **File uploads**: a shared `uploadFile(bucket, file, opts)` helper wrapping the storage-proxy endpoints, enforcing the same client-side size/mime constraints the backend already enforces per bucket (fail fast in the UI rather than round-tripping a guaranteed-400).

### Caching/Realtime Strategy by Data Type

| Data | Strategy |
|---|---|
| Auth/session (`/api/auth/me`) | Short `staleTime` (~1 min), refetch on window focus/reconnect; drives route guards. |
| Leads list/board (Kanban) | Server-paginated via TanStack Query + manual pagination; moderate `staleTime` (~30s) plus realtime invalidation on `workspace:{id}` lead-changed events (if/when the new or existing backend emits them — confirm event names before building). |
| Conversations/messages, Telegram/Instagram chats | Realtime-first: socket events push directly into the query cache (`setQueryData`) for open threads; background list views use invalidate-on-event rather than polling. |
| Billing/usage/plans | Long `staleTime` (minutes), no realtime; refetch on explicit user action (e.g. after a purchase) via mutation `onSuccess` invalidation. |
| Workspace/settings | Long `staleTime`, invalidate on mutation only. |
| Presence/heartbeat | Not cached via TanStack Query at all — pure socket-driven ephemeral state (Zustand or component-local), matching the old system's `presence:heartbeat`/`presence_changed` pattern. |
| File/media (avatars, generated-media, signed URLs) | Signed/public URLs cached as returned (they're time-limited by the backend itself); no separate client cache layer needed beyond the browser's. |

Realtime wiring reuses the existing Socket.io gateway and topic-room model (`workspace:{id}`, `user_notifications:{id}`, `tg-channel:{id}`, `messages:{id}`) with zero backend changes — the new frontend's `services/realtime/subscriptions.ts` should map each topic to the specific `queryClient.invalidateQueries`/`setQueryData` calls it triggers, kept as an explicit table rather than scattered `useEffect` socket listeners per component.

### Deployment (PM2, production build)

- `next build` → `output: standalone` → PM2 process runs `node .next/standalone/server.js` (or an `ecosystem.config.js` entry pointing at a small start script), per-environment `.env.production`/`.env.test` supplying `NEXT_PUBLIC_API_BASE_URL`/`NEXT_PUBLIC_WS_URL` at build time (Next.js inlines `NEXT_PUBLIC_*` at build, so **test and prod need separate builds**, matching the old system's separate test/beta/prod deploy targets rather than one runtime-switchable build).
- Follow the same three-environment promotion pattern already in place (test.operatora.ai / beta / operatora.ai) for consistency with how the backend team already operates, unless told otherwise.

---

## Open Questions — Resolved (2026-08-12)

1. **Auth transport**: Bearer token (decision — matches old mobile client's approach, not the old web client's httpOnly cookie approach).
2. **Admin console**: ships as a route group (`src/app/(admin)/*`) in the same Next.js app, not a separate deployable.
3. **`/tasks` backend entity**: confirmed real. `TasksController` at `/tasks` (`app/backend/src/tasks/tasks.controller.ts`), guarded by `JwtAuthGuard`. Endpoints: `GET /tasks/settings`, `PUT /tasks/settings`, `GET /tasks` (`scope=mine|team`, `lead_id`), `GET /tasks/assignees`, `POST /tasks`, `PATCH /tasks/:id/complete`. Backed by table `operator_tasks` via a raw Supabase client (`tasks.service.ts`) — **not** modeled in `prisma/schema.prisma`, so it won't appear in Prisma-derived types. Row shape: `id, workspace_id, lead_id, assigned_to, assigned_operator_id, created_by, title, task_type, source, status, due_at, completed_at, closure_comment, created_at, updated_at` plus joined `leads {id, first_name, last_name, phone_number}`. Build a dedicated `tasksApi` service and query keys, same tier as leads. `POST /tasks` and `PUT /tasks/settings` take `@Body() body: unknown` (no DTO) — hand-type these requests in the frontend.
4. **Realtime event names/payloads**: gateway at `app/backend/src/realtime/realtime.gateway.ts`, namespace `/`, websocket-only, JWT via `handshake.auth.token`. Client subscribes with `{topic}`; server always emits on wire event `channel:${topic}` with payload `{event, table, new, old, topic, ...extra}` (types in `realtime.types.ts`).
   - `workspace:{workspaceId}` topic, table `leads`: `lead_moved` (`new: {leadIds, columnId}`), `lead_assigned` (`new: {leadIds, operator_id}`), `lead_deleted` (`new: {leadIds}`), `lead_phone_bound` (`new: {id, phone_number, is_primary}`).
   - `workspace:{workspaceId}` topic, other tables: `webhook_payload_preview` (integration_connections), `presence_changed` (`new: {user_id, online, last_seen}`), `call_started`/`call_ended` (routed to the receiving user, not workspace-wide — rich payload with `call_id, lead_id, operator_id, phone_number, duration_sec, status, direction`), `conversation_analysis_ready`, `feedback_sent`.
   - `user_notifications:{userId}` topic, table `notifications`, event `INSERT`: fired for lead assignment, task assignment, task-overdue sweep, automation notify actions, department escalation, admin notifications. Also carries `team_chat_mention` and `session_superseded`.
   - `messages:{workspaceId}` topic, table `messages`, events `INSERT`/`UPDATE`: raw message row.
   - **Gap**: no realtime event exists for lead *creation* or board/column CRUD (verified — zero `realtime` references in `board.service.ts`, `columns.service.ts`, `add-lead.service.ts`, `leads.service.ts`). The new frontend must use plain query-invalidation (not a socket subscription) for those cases; only `lead_moved`/`lead_assigned`/`lead_deleted`/`lead_phone_bound` get targeted cache patches via `setQueryData`.
5. **Swagger/OpenAPI**: live by default outside production (`app/backend/src/main.ts:47-64`, mounted at `api/docs`, JSON at `api/docs-json`; `@nestjs/swagger ^7.4.2`). Controlled by `ENABLE_SWAGGER` env var — on in dev/local, off by default in prod. Coverage: 138/142 controllers have `@ApiTags`, 136 have `@ApiOperation`, 151 dedicated DTO files with both `class-validator` and `@nestjs/swagger` decorators. **Caveat**: ~11 controllers (including Tasks' `create`/`settingsPut`) accept `@Body() body: unknown` documented only via inline `@ApiBody({schema})`, not a typed DTO — codegen from `api/docs-json` will be accurate for typed endpoints but those ~11 need hand-authored request types. Recommendation: enable `ENABLE_SWAGGER=true` against dev/staging and generate a TS client/types from `api/docs-json` for the bulk of the API; hand-type the untyped-body endpoints.

Phase 1 architecture is fully closed — proceeding to Phase 2 scaffolding.
