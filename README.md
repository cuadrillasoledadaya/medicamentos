# Medicamentos — Medication Tracker PWA

A Progressive Web App for families to track medications, schedules, and adherence across multiple patients and caregivers. Built for offline-first use with Supabase as the backend.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | React Router v7 |
| Server state | TanStack Query v5 |
| UI state | Zustand |
| Forms | react-hook-form + Zod |
| Date/time | date-fns + date-fns-tz |
| Offline | IndexedDB (idb) + outbox pattern |
| PWA | vite-plugin-pwa + Workbox |
| Backend | Supabase (Postgres + Auth + RLS + Realtime) |
| PDF | @react-pdf/renderer |
| Package manager | pnpm |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your Supabase URL + anon key

# 3. Start the dev server
pnpm dev
```

## Project Structure

```
medicamentos/
├── src/                          # React application source
├── supabase/                     # Database migrations and setup
│   ├── migrations/               # SQL migration files
│   └── README.md                 # Supabase setup instructions
├── openspec/                     # SDD artifacts (specs, design, tasks)
│   └── changes/medication-tracker-pwa/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run E2E tests (Playwright) |

## Status

| Phase | Status | Branch | Notes |
|-------|--------|--------|-------|
| PR 1 — Bootstrap + Migration | **Done** | `feat/medication-tracker-pwa-pr1-bootstrap` | Git repo, Vite scaffold, dependencies, 0001 schema |
| PR 2 — Frontend Foundation + Auth | **Done** | `feat/medication-pr2-frontend-foundation` | lib/ data layer, app shell, auth flow, PWA config |
| PR 3 — Core Data Plane | **Done** | `feat/medication-pr3-core-data-plane` | Pacientes, medications, schedules, plans, tomas lifecycle |
| PR 4 — Reminder Pipeline | **Done** | `feat/medication-pr4-reminder-pipeline` | schedule-generator + notify-fallback Edge Functions, SW notifications |
| PR 5 — Insight + Curation | **Done** | `feat/medication-pr5a-adherence` + `pr5b-interactions-stock` | Adherence dashboard, interactions, stock alerts |
| PR 6 — Lifecycle Features | **Done** | `feat/medication-pr6{a,b,c}-*` | Vacation, retention, reports, travel, reopen |
| PR 7 — Polish + Tests | **Done** | `feat/medication-pr7{a,b,c,d}-*` | Settings UI, iOS badge, Vitest (61 tests), Playwright (26 E2E + RLS), strict TDD activated |

## Testing

The project uses **strict TDD** from this point forward. All new code must follow the RED-GREEN-REFACTOR cycle.

### Test runners

| Layer | Tool | Command | Location |
|-------|------|---------|----------|
| Unit + integration | Vitest 4 (jsdom) | `pnpm test:run` | `src/lib/**/*.test.ts` |
| E2E + RLS contract | Playwright 1.61 | `pnpm test:e2e` | `tests/e2e/**/*.spec.ts` |
| Type check | TypeScript | `pnpm tsc --noEmit` | — |
| Lint | ESLint | `pnpm lint` | — |
| Coverage | v8 (Vitest) | `pnpm test:coverage` | `coverage/` (threshold 60%) |

### E2E test setup (one-time)

The Playwright suite uses two test users in the live Supabase project. Create them in **Supabase Auth Dashboard → Users → Add user** with **"Auto Confirm User"** enabled:

- `e2e-test-a@medicamentos.test`
- `e2e-test-b@medicamentos.test`

Then install Chromium and run:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

The RLS contract test (`tests/e2e/rls.spec.ts`) signs in as both users and verifies that cross-user SELECT/INSERT/UPDATE/DELETE attempts on every RLS-protected table are rejected.

### TDD workflow

For any new feature or bug fix:

1. **RED** — write the failing test first (Vitest for unit, Playwright for E2E).
2. **GREEN** — implement the minimum code to pass the test.
3. **REFACTOR** — clean up while keeping tests green.

Coverage threshold is 60% on the Vitest v8 report. PRs that drop below this will be rejected by `sdd-verify`.

### Pending manual steps

- **Apply 0006 migration** in the Supabase SQL Editor to enable the adherence view (`v_adherence_28d`). The SQL is in `supabase/migrations/0006_adherence_view.sql` (idempotent — safe to re-run).
- **Create E2E test users** (see above) before running `pnpm test:e2e`.
