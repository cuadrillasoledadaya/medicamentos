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

| Phase | Status | Notes |
|-------|--------|-------|
| PR 1 — Bootstrap + Migration | **Done** | Git repo, Vite scaffold, dependencies, SQL migration file |
| PR 2 — Frontend Foundation + Auth | Planned | lib/ data layer, app shell, auth flow, PWA config |
| PR 3 — Core Data Plane | Planned | Pacientes, medications, schedules, plans, tomas lifecycle |
| PR 4 — Reminder Pipeline | Planned | Edge Functions, SW notifications, email/SMS fallback |
| PR 5 — Insight + Curation | Planned | Adherence dashboard, interactions, stock alerts |
| PR 6 — Lifecycle Features | Planned | Vacation mode, retention, reports, travel adjustment, reopen |
| PR 7 — Polish + Tests | Planned | Settings, iOS badge, Vitest, Playwright RLS suite |

### Pending

- **Supabase credentials**: The project owner needs to provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` before PR 2+ can connect to the database.
- **Apply migration**: Run `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL Editor (see `supabase/README.md`).
