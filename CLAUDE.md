# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Ground-up Next.js rebuild of the Operatora frontend, targeting the existing NestJS backend as-is (no backend changes). The old system at `/www/wwwroot/dev.operatora` is a **read-only reference** for behavior/API parity — never modify, delete, rename, or move anything under it. Full details, decisions, and evidence trail: `ARCHITECTURE.md` (stack rationale, API contract, state boundaries, realtime event catalog). Read `PROGRESS.md` first in any new session — it's the durable record of what's built and what's next; update it as phases complete.

## Commands

```
npm run dev        # next dev
npm run build       # next build (output: standalone)
npm start           # next start
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

No test runner is configured. `templates/**` (read-only HeroUI Pro reference material) is excluded from lint/typecheck.

`NEXT_PUBLIC_*` env vars are inlined at build time — test/beta/prod each require their own build, never one runtime-switchable build. See `.env.example` for `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_WS_URL`. Backend base is always `<origin>/api`; the Socket.io gateway is mounted at `/` on the same origin, not under `/api`.

Deploy: `next build` → PM2 runs `node .next/standalone/server.js` (see `ecosystem.config.cjs`). Three environments promote the same way the backend does: `test` branch → test.operatora.ai, `beta` → beta.operatora.ai, `main` → operatora.ai.

## Architecture (see `ARCHITECTURE.md` for full rationale)

- **Framework**: Next.js 16 App Router, `output: standalone`, TypeScript strict.
- **Server state**: TanStack Query only — never mirrored into Zustand. All fetches go through a centralized `apiFetch` wrapper (`src/services/api/`); no component calls `fetch` directly. Single in-flight refresh promise shared across concurrent 401s (mutex pattern).
- **Global client state**: Zustand (`src/state/`), scoped to UI/session concerns only (active workspace id, sidebar, theme, realtime status) — never server data.
- **URL state**: table page/sort/filter, active tab, selected board/column via `useSearchParams`.
- **Forms**: React Hook Form + Zod; Zod schemas double as the TS type source.
- **Tables**: TanStack Table (headless) + HeroUI table primitives, `manualPagination`/`manualSorting` to match the backend's server-driven pagination.
- **Realtime**: `socket.io-client` singleton (`src/services/realtime/`); socket events call `queryClient.invalidateQueries`/`setQueryData` directly rather than a separate realtime store. Topic/event catalog (what's actually emitted, and the known gaps — e.g. no realtime event for lead creation or board/column CRUD) is documented in `ARCHITECTURE.md` under "Open Questions — Resolved" — check it before wiring a new subscription rather than guessing event names.
- **UI**: HeroUI (`@heroui/react` + `@heroui-pro/react`) wherever a component exists; `src/components/ui/` wraps/composes primitives, `src/components/shared/` holds cross-feature composites (EmptyState, ErrorState, DataTable, ConfirmDialog).
- **Feature folders** (`src/features/<name>/`): colocated `components/`, `hooks/`, `api.ts`, `schema.ts` per business domain (leads, conversations, billing, telegram, instagram, eskiz, tasks, etc.).
- Path alias: `@/*` → `./src/*`.

Auth uses Bearer tokens (a deliberate deviation from the old web client's httpOnly-cookie approach — see `ARCHITECTURE.md` Open Questions #1). Permission checks need both the global `roles[]` and the workspace-scoped `role`/`permissions` from `/api/auth/me` — a flat `isAdmin` boolean is not sufficient. Never send `workspace_id` as a client param expecting it to scope data; the backend derives it from the JWT.

## Non-negotiables carried into every change

- No calls in render loops; dedupe identical in-flight requests; debounce high-frequency inputs (~300ms); cancel obsolete requests on unmount/key change; guard mutations against double-click duplication; no auto-retry on non-idempotent mutations.
- Every API-driven feature handles: loading, success, empty, validation error, auth error, authorization error, network error, server error, timeout — no blank or infinitely-loading screens, no faked mutation success while offline.
- Frontend validation is UX only, never a security boundary — the backend is the real authority.
- Strict typing, no unjustified `any`; API types centralized, not duplicated per feature.
- No unrelated refactors, no new dependencies without clear justification, no backend changes unless explicitly requested.

Four project subagents encode this process end-to-end and should be used for non-trivial work: `architect` (structure/library decisions), `frontend-expert` (implementation), `code-reviewer` (pre-completion review against the rules above), `senior` (drives the full sequence for substantial features). Definitions: `.claude/agents/*.md`.
