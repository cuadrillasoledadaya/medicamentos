# Tasks: Medication Tracker PWA

## Task Checklist

- [x] T-001: Initialize git repo and project root
- [x] T-002: Scaffold Vite + React + TypeScript
- [x] T-003: Install all runtime and dev dependencies
- [x] T-004: Apply SQL migration to fresh Supabase project
- [x] T-005: Implement lib/ data layer
- [x] T-006: Build app shell, routing, and layout
- [x] T-007: Implement auth flow
- [x] T-008: Configure PWA with vite-plugin-pwa
- [x] T-009: Implement pacientes + family_memberships
- [x] T-010: Implement medications CRUD
- [x] T-011: Implement schedules CRUD
- [x] T-012: Implement plan-temporada
- [x] T-013: Implement tomas lifecycle
- [x] T-014: Implement schedule generator Edge Function
- [x] T-015: Implement SW notification scheduler
- [x] T-016: Implement notify-fallback Edge Function
- [x] T-017: Implement adherence view and dashboard widget
- [x] T-018: Implement interactions
- [x] T-019: Implement stock alerts
- [x] T-020: Implement vacation mode
- [x] T-021: Implement retention admin
- [x] T-022: Implement reports (PDF + share link)
- [x] T-023: Implement travel-adjustment UI
- [x] T-024: Implement closed-temporada reopen flow (Q5=C)
- [x] T-025: Implement notification_settings UI
- [x] T-026: Implement iOS PWA status badge + dashboard banner
- [x] T-027: Implement settings page
- [x] T-028: Set up Vitest and write unit tests
- [x] T-029: Set up Playwright and write E2E + RLS tests
- [x] T-030: Flip strict_tdd and update testing capabilities

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~6,200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 7 PR groups (2–6 tasks each) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Bootstrap + Supabase migration | PR 1 | T-001 to T-004. Base: main. ~380 lines |
| 2 | Frontend foundation + Auth | PR 2 | T-005 to T-008. Base: main. ~900 lines — split into 2 chained PRs if needed |
| 3 | Core data plane | PR 3 | T-009 to T-013. Base: main. ~1,450 lines — split into 2-3 chained PRs |
| 4 | Reminder pipeline | PR 4 | T-014 to T-016. Base: PR 3. ~610 lines — split into 2 chained PRs |
| 5 | Insight + curation | PR 5 | T-017 to T-019. Base: PR 4. ~700 lines — split into 2 chained PRs |
| 6 | Lifecycle features | PR 6 | T-020 to T-024. Base: PR 5. ~1,400 lines — split into 2-3 chained PRs |
| 7 | Polish + tests | PR 7 | T-025 to T-030. Base: PR 6. ~1,100 lines — split into 2 chained PRs |

## Phase 1: Bootstrap

### Task T-001: Initialize git repo and project root [x]

- **Scope**: Create empty git repo, `.gitignore` with Node/TS/Supabase rules, `pnpm init`.
- **Files**: `.gitignore`, `package.json`, no source yet.
- **Acceptance**: `git log --oneline` shows initial commit. `pnpm --version` succeeds. `.gitignore` covers `node_modules/`, `.env`, dist.
- **Estimate**: ~5 lines.
- **Depends on**: None.
- **PR boundary**: chained-pr (PR 1 / 1).
- **Verification**: `git status` shows clean working tree.

### Task T-002: Scaffold Vite + React + TypeScript [x]

- **Scope**: Run `pnpm create vite . --template react-ts`. Set `tsconfig.json` strict mode. Add path alias `@/* → src/*`. Base `vite.config.ts`.
- **Files**: `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`.
- **Acceptance**: `pnpm dev` boots without errors. `pnpm tsc --noEmit` passes. Browser shows Vite default page.
- **Estimate**: ~20 lines.
- **Depends on**: T-001.
- **PR boundary**: chained-pr (PR 1 / 1).
- **Verification**: `pnpm tsc --noEmit && pnpm dev --host 0.0.0.0` (smoke test).

### Task T-003: Install all runtime and dev dependencies [x]

- **Scope**: Install runtime deps: `react-router-dom @supabase/supabase-js @tanstack/react-query zustand idb react-hook-form zod date-fns date-fns-tz @react-pdf/renderer`. Install dev deps: `vite-plugin-pwa workbox-window vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test eslint prettier`.
- **Files**: `package.json`, `pnpm-lock.yaml`.
- **Acceptance**: `pnpm ls --depth 0` shows all deps. No version conflicts.
- **Estimate**: ~5 lines.
- **Depends on**: T-002.
- **PR boundary**: chained-pr (PR 1 / 1).
- **Verification**: `pnpm install --frozen-lockfile` succeeds.

## Phase 2: Supabase Foundation

### Task T-004: Apply SQL migration to fresh Supabase project [x]

- **Scope**: Create `supabase/migrations/0001_init.sql` with the full schema from design.md §5: 15 tables, 5 enums, 3 trigger functions, partial EXCLUDE constraints, full RLS with SECURITY DEFINER helpers, seed data, plus Q5=C amendments (`temporada_reopen_audit` table + conditional-immutability trigger). Create `.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `TWILIO_*` placeholders.
- **Files**: `supabase/migrations/0001_init.sql`, `.env.example`.
- **Acceptance**: SQL runs without errors against empty project. All 15 tables exist. RLS enabled on all. EXCLUDE constraints reject overlapping vacations. `temporada_reopen_audit` table exists. Trigger prevents mutating closed temporadas <90 days. `is_active_family_member`, `is_cuidador_principal`, `paciente_of_medication` functions exist.
- **Estimate**: ~350 lines.
- **Depends on**: T-003 (pnpm + deps needed for supabase CLI or manual SQL runner).
- **PR boundary**: chained-pr (PR 1 / 1).
- **Verification**: Connect via `psql` or Supabase SQL editor, run `\dt` to verify 15 tables. Test EXCLUDE by inserting overlapping vacations (expect error). Verify `temporada_reopen_audit` table exists.

## Phase 3: Frontend Foundation

### Task T-005: Implement lib/ data layer [x]

- **Scope**: Build `src/lib/` skeleton: typed Supabase client (`supabase.ts`), IndexedDB schema (`idb.ts`, 4 object stores), outbox module (`enqueue`, `replay`, `pendingCount`, `onStatusChange`), base repository classes, time helpers (`formatInTz`, `parseInTz`, `shiftTz`), Zod validation schemas.
- **Files**: `src/lib/supabase.ts`, `src/lib/idb.ts`, `src/lib/outbox/index.ts`, `src/lib/outbox/outbox.test.ts`, `src/lib/repositories/base.ts`, `src/lib/time/index.ts`, `src/lib/validation/schemas.ts`, `src/lib/validation/schemas.test.ts`.
- **Acceptance**: `supabase` client type-checks. `idb` opens with 4 stores. Outbox `enqueue` writes to IndexedDB, `replay` drains queue. `formatInTz` converts correctly. Zod schemas validate valid/invalid payloads.
- **Estimate**: ~300 lines.
- **Depends on**: T-004 (need env vars structure).
- **PR boundary**: chained-pr (PR 2 / 1).
- **Verification**: `pnpm vitest run src/lib/` passes.

### Task T-006: Build app shell, routing, and layout [x]

- **Scope**: Set up React Router v6 with lazy routes: `/`, `/login`, `/pacientes/:id/*`, `/medications`, `/schedules`, `/intake/today`, `/reports`, `/settings`, `/admin/interactions`, `/share/:token`. Create `App.tsx` with `<Suspense>` + loading spinner. Error boundary. Shell layout with nav sidebar (cuidador) and header (active paciente switcher).
- **Files**: `src/router.tsx`, `src/App.tsx`, `src/components/ui/Shell.tsx`, `src/components/ui/Nav.tsx`, `src/components/ui/ErrorBoundary.tsx`, `src/components/ui/LoadingSpinner.tsx`, `src/hooks/useActivePaciente.ts`.
- **Acceptance**: All routes render placeholder content. Nav highlights current route. Error boundary catches crashes. Active paciente switcher works.
- **Estimate**: ~200 lines.
- **Depends on**: T-005.
- **PR boundary**: chained-pr (PR 2 / 2).
- **Verification**: `pnpm dev` and navigate all routes manually. Check error boundary by mounting a crashing component.

### Task T-007: Implement auth flow [x]

- **Scope**: Login page (email/password), signup page, Google OAuth button. `useAuth` hook wrapping `supabase.auth`. Protected route component (`<ProtectedRoute>` redirects to `/login`). Session restoration on reload. Sign-out clears IDB cached stores.
- **Files**: `src/features/auth/routes.tsx`, `src/features/auth/LoginForm.tsx`, `src/features/auth/SignupForm.tsx`, `src/features/auth/hooks.ts`, `src/components/auth/ProtectedRoute.tsx`.
- **Acceptance**: Sign-up creates user (email confirmation required). Login restores session on reload. Google OAuth button present. Protected routes redirect unauthenticated users. Sign-out clears IDB caches.
- **Estimate**: ~250 lines.
- **Depends on**: T-006 (routing), T-004 (Supabase Auth configured).
- **PR boundary**: chained-pr (PR 2 / 2).
- **Verification**: Manual smoke test: signup → confirm email → login → reload (session persists) → logout → redirected to `/login`.

### Task T-008: Configure PWA with vite-plugin-pwa [x]

- **Scope**: Add `VitePWA()` to `vite.config.ts`: `registerType: 'autoUpdate'`, `workbox` runtime caching for Supabase REST endpoints, navigation fallback to `/offline.html`. Create PWA manifest icons (192px, 512px, maskable). Create `offline.html`. Register SW in `main.tsx`.
- **Files**: `vite.config.ts` (amend), `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable.png`, `public/offline.html`, `src/sw.ts` (or auto-generated).
- **Acceptance**: Lighthouse PWA audit passes (installable, offline). `pnpm build` produces SW + precache manifest. Offline navigation shows `offline.html`. Workbox caches Supabase REST responses.
- **Estimate**: ~150 lines.
- **Depends on**: T-005.
- **PR boundary**: chained-pr (PR 2 / 2).
- **Verification**: `pnpm build && pnpm preview`. DevTools → Application → Service Workers shows registered. Disable network → navigate to app shell → loads from cache.

## Phase 4: Core Data Plane

### Task T-009: Implement pacientes + family_memberships

- **Scope**: Paciente CRUD (name, DOB, photo). Family member invite flow (add user by email, select role). Multi-paciente selector in nav header. RLS-aware queries via `lib/repositories/pacientes.ts` and `lib/repositories/family.ts`.
- **Files**: `src/features/family/routes.tsx`, `src/features/family/PacienteList.tsx`, `src/features/family/PacienteForm.tsx`, `src/features/family/FamilyMemberList.tsx`, `src/features/family/InviteForm.tsx`, `src/features/family/hooks.ts`, `src/features/family/validation.ts`, `src/lib/repositories/pacientes.ts`, `src/lib/repositories/family.ts`.
- **Acceptance**: Create paciente. Invite family member by email. Invited user sees pending invitation. Cuidador principal can revoke access. Paciente switcher lists all pacientes.
- **Estimate**: ~250 lines.
- **Depends on**: T-007 (auth to know current user), T-005 (repositories pattern).
- **PR boundary**: chained-pr (PR 3 / 1).
- **Verification**: `pnpm vitest run src/features/family/`. Manual: create paciente → invite secondary user → switch accounts → confirm access.

### Task T-010: Implement medications CRUD

- **Scope**: Medication form (name, dose_value, dose_unit from enum, route, frequency_hint, notes, photo upload). Medication list with active/inactive toggle. Photo upload to Supabase Storage with client-side resize (1024px). Dose-unit enum: mg, ml, gotas, UI, comprimidos, parches, sobres, cucharadas, aplicaciones, inyecciones, otro.
- **Files**: `src/features/medications/routes.tsx`, `src/features/medications/MedicationList.tsx`, `src/features/medications/MedicationForm.tsx`, `src/features/medications/hooks.ts`, `src/features/medications/validation.ts`, `src/lib/repositories/medications.ts`.
- **Acceptance**: Create medication with all fields. Upload photo, see signed URL in detail view. Toggle active/inactive. Dose-unit validation rejects invalid values. List filters by paciente context.
- **Estimate**: ~300 lines.
- **Depends on**: T-009 (paciente context), T-008 (photo storage RLS).
- **PR boundary**: chained-pr (PR 3 / 1).
- **Verification**: `pnpm vitest run src/features/medications/`. Manual: create medication, upload photo, verify RLS blocks secondary caregiver.

### Task T-011: Implement schedules CRUD

- **Scope**: Schedule form (time_of_day, weekday_mask checkboxes, timezone_id selector, notes). Weekday bitfield encoding (Sun=0…Sat=6). Active toggle. List schedules per medication.
- **Files**: `src/features/schedules/routes.tsx`, `src/features/schedules/ScheduleList.tsx`, `src/features/schedules/ScheduleForm.tsx`, `src/features/schedules/hooks.ts`, `src/features/schedules/validation.ts`, `src/lib/repositories/schedules.ts`.
- **Acceptance**: Create schedule with weekday mask. Edit time. Toggle active. List grouped by medication. Timezone picker defaults to paciente's timezone.
- **Estimate**: ~250 lines.
- **Depends on**: T-010 (medications must exist).
- **PR boundary**: chained-pr (PR 3 / 2).
- **Verification**: `pnpm vitest run src/features/schedules/`. Manual: create schedule, verify weekday mask, toggle active.

### Task T-012: Implement plan-temporada

- **Scope**: Temporada CRUD (name, start_date, end_date, close). Plan linking: create permanent plan or seasonal plan (linked to temporada). Current-context resolver: permanent plans + open temporada plans. Close temporada → freeze plans and tomas.
- **Files**: `src/features/plans/routes.tsx`, `src/features/plans/TemporadaList.tsx`, `src/features/plans/TemporadaForm.tsx`, `src/features/plans/PlanList.tsx`, `src/features/plans/PlanForm.tsx`, `src/features/plans/hooks.ts`, `src/features/plans/validation.ts`, `src/lib/repositories/temporadas.ts`, `src/lib/repositories/plans.ts`.
- **Acceptance**: Create open temporada. Create permanent plan (no temporada). Create seasonal plan (links to temporada). Close temporada → plans become read-only. Current-context shows permanent + open temporada plans only.
- **Estimate**: ~250 lines.
- **Depends on**: T-009 (paciente context), T-010 (medications).
- **PR boundary**: chained-pr (PR 3 / 2).
- **Verification**: `pnpm vitest run src/features/plans/`. Manual: create temporada → create seasonal plan → close temporada → verify plans read-only.

### Task T-013: Implement tomas lifecycle

- **Scope**: Toma status state machine (`pending` → `taken_on_time`/`taken_late`/`skipped`/`missed`). 15-min tolerance window. Snooze (10 min deferral). Skip with reason. Idempotent upsert via `(schedule_id, scheduled_at)`. Outbox-wired mutations: offline queue, replay on reconnect. Cross-day backfill: counts as `taken_late` within 7-day window, rejected after.
- **Files**: `src/features/intake/routes.tsx`, `src/features/intake/TomaList.tsx`, `src/features/intake/TomaActions.tsx`, `src/features/intake/TomaStatus.tsx`, `src/features/intake/hooks.ts`, `src/features/intake/validation.ts`, `src/lib/repositories/tomas.ts`.
- **Acceptance**: Mark toma as taken (on time/late). Snooze defers miss evaluation. Skip with reason. Idempotent: second action on same slot updates status. Outbox enqueues when offline, replays on reconnect. Cross-day backfill within 7 days marked `taken_late`. Backfill after 7 days rejected.
- **Estimate**: ~400 lines (at limit).
- **Depends on**: T-011 (schedules), T-005 (outbox), T-004 (tomas table + RLS).
- **PR boundary**: chained-pr (PR 3 / 3).
- **Verification**: `pnpm vitest run src/features/intake/`. Integration: mock navigator.onLine=false, create toma offline, set online=true, verify outbox replay.

## Phase 5: Reminder Pipeline

### Task T-014: Implement schedule generator Edge Function

- **Scope**: Create Supabase Edge Function `generate-tomas` (Deno). Scheduled via `pg_cron` at 00:00 UTC and 12:00 UTC. Materializes tomas for next 14 days. Reads active schedules + weekday_mask. Computes `scheduled_at` in schedule's timezone, stores as UTC. Skips vacation-overlapping dates (sets `status='skipped', skip_reason='vacation'`). `ON CONFLICT (schedule_id, scheduled_at) DO NOTHING`.
- **Files**: `supabase/functions/generate-tomas/index.ts`, `supabase/functions/generate-tomas/cron.sql`.
- **Acceptance**: Function inserts tomas for next 14 days matching weekday mask. Skips Sundays when mask=62. Vacation dates get `skip_reason='vacation'`. Idempotent: re-run does not duplicate.
- **Estimate**: ~180 lines.
- **Depends on**: T-004 (tables exist), T-011 (schedules).
- **PR boundary**: chained-pr (PR 4 / 1).
- **Verification**: Deploy function, invoke manually: verify correct number of tomas created. Verify vacation skips.

### Task T-015: Implement SW notification scheduler

- **Scope**: Service Worker receives `postMessage` with new tomas from Realtime. Schedules `setTimeout` / `showTrigger` per toma. Shows `showNotification` with 3 action buttons ("Marcar como tomada", "Posponer 10 min", "Saltar"). Action handlers call `clients.matchAll` → `postMessage` → main thread upserts toma. Badge update (`navigator.setAppBadge` where supported).
- **Files**: `src/lib/sw/notification-handlers.ts`, `src/lib/sw/message-router.ts`, `src/lib/sw/badge.ts`, `src/features/reminders/hooks.ts`.
- **Acceptance**: New toma triggers notification at scheduled time. Action buttons work: "Marcar como tomada" logs taken, "Posponer 10 min" sets snooze, "Saltar" marks skipped. Badge shows pending count.
- **Estimate**: ~250 lines.
- **Depends on**: T-008 (SW registration), T-013 (tomas repository).
- **PR boundary**: chained-pr (PR 4 / 1).
- **Verification**: Manual: create schedule → wait for notification → tap each action → verify in DB.

### Task T-016: Implement notify-fallback Edge Function

- **Scope**: Create Supabase Edge Function `notify-fallback`. Triggered by DB trigger on `tomas` INSERT (status='pending' and no vacation skip). Reads `notification_settings` for paciente+medication. If `email` enabled → sends via Resend API. If `sms` enabled → sends via Twilio API. Respects per-medication override. Logs delivery status.
- **Files**: `supabase/functions/notify-fallback/index.ts`, `supabase/functions/notify-fallback/trigger.sql`, `supabase/functions/notify-fallback/resend.ts`, `supabase/functions/notify-fallback/twilio.ts`.
- **Acceptance**: INSERT toma → Edge Function fires. Email sent when channel=email enabled. SMS sent when channel=sms enabled. Per-medication disabled suppresses that channel. Env vars documented.
- **Estimate**: ~180 lines.
- **Depends on**: T-004 (notification_settings table), T-013 (tomas INSERT trigger concept).
- **PR boundary**: chained-pr (PR 4 / 2).
- **Verification**: Deploy function. Insert toma. Check Resend/Twilio logs. Verify notification_settings disables channel.

## Phase 6: Insight + Curation

### Task T-017: Implement adherence view and dashboard widget

- **Scope**: Create `v_adherence_28d` SQL view (28-day rolling window, adherence = on_time / denominator, vacation skips excluded). Dashboard widget: 4-week bar chart (daily adherence percentage, green/yellow/red bands). Weekly average. Component reads from the view via repository.
- **Files**: `supabase/migrations/0002_adherence_view.sql`, `src/features/adherence/routes.tsx`, `src/features/adherence/AdherenceChart.tsx`, `src/features/adherence/hooks.ts`, `src/lib/repositories/adherence.ts`.
- **Acceptance**: View returns correct daily adherence. Vacation skips excluded from denominator. Chart renders with color bands. Weekly average computed.
- **Estimate**: ~250 lines.
- **Depends on**: T-013 (tomas data), T-012 (vacation exclusion).
- **PR boundary**: chained-pr (PR 5 / 1).
- **Verification**: `pnpm vitest run src/features/adherence/`. SQL: `SELECT * FROM v_adherence_28d WHERE paciente_id = '...'` returns correct percentages.

### Task T-018: Implement interactions

- **Scope**: Seed `interactions` table with curated pairs. Admin CRUD UI (add/edit/delete pairs with severity + description). Alert on medication add: scan active medications for known interactions. Temporal conflict alert: warn when two medications with severity >= caution are scheduled within 5 min of each other.
- **Files**: `supabase/seed/001_interactions.sql`, `src/features/interactions/routes.tsx`, `src/features/interactions/InteractionAdmin.tsx`, `src/features/interactions/InteractionAlert.tsx`, `src/features/interactions/hooks.ts`, `src/lib/repositories/interactions.ts`.
- **Acceptance**: Seed pairs load. Admin can add/edit/delete pairs. Adding a medication with a known conflict shows alert. Creating a schedule with temporal conflict shows warning.
- **Estimate**: ~250 lines.
- **Depends on**: T-010 (medications exist), T-011 (schedules for temporal conflict).
- **PR boundary**: chained-pr (PR 5 / 1).
- **Verification**: `pnpm vitest run src/features/interactions/`. Manual: add conflicting meds → verify alert.

### Task T-019: Implement stock alerts

- **Scope**: Stock decrement on toma (DB trigger exists from T-004; wire UI feedback). Low-stock threshold UI per medication (default 7 days). Dashboard banner listing low-stock medications with remaining count. Manual stock adjustment form with required reason.
- **Files**: `src/features/stock/routes.tsx`, `src/features/stock/StockAlertBanner.tsx`, `src/features/stock/StockAdjustForm.tsx`, `src/features/stock/hooks.ts`, `src/lib/repositories/stock.ts`.
- **Acceptance**: Stock decrements on toma. Low-stock banner shows when stock <= threshold. Manual adjustment logs to `stock_adjustments`. Threshold configurable per medication.
- **Estimate**: ~200 lines.
- **Depends on**: T-013 (tomas trigger stock decrement), T-010 (medications with stock fields).
- **PR boundary**: chained-pr (PR 5 / 2).
- **Verification**: Create medication with stock=5, threshold=7 → banner shows. Mark toma taken → stock=4. Manual adjust stock → verify audit row in `stock_adjustments`.

## Phase 7: Lifecycle Features

### Task T-020: Implement vacation mode

- **Scope**: Vacation CRUD: create GLOBAL (all medications) or PER_MEDICATION vacation with date range. Cancel mid-vacation (set ends_at=now()). Overlap prevention via EXCLUDE constraint (DB-enforced from T-004). End-of-vacation resumption (automatic when `now() > ends_at`). UI: vacation list, create form with scope picker.
- **Files**: `src/features/vacation/routes.tsx`, `src/features/vacation/VacationList.tsx`, `src/features/vacation/VacationForm.tsx`, `src/features/vacation/hooks.ts`, `src/lib/repositories/vacations.ts`.
- **Acceptance**: Create GLOBAL vacation → all reminders suppressed. Create PER_MEDICATION vacation → only that med suppressed. Overlapping vacation rejected with 409. Cancel mid-vacation → resumption immediate. EXCLUDE constraint test (attempt overlapping via direct SQL → expects error).
- **Estimate**: ~300 lines.
- **Depends on**: T-009 (pacientes), T-010 (medications), T-004 (vacations table + EXCLUDE).
- **PR boundary**: chained-pr (PR 6 / 1).
- **Verification**: `pnpm vitest run src/features/vacation/`. Manual: create overlapping vacations → expect error. Create GLOBAL vacation → verify schedule generator adds `skip_reason='vacation'`.

### Task T-021: Implement retention admin

- **Scope**: Retention policy UI: view current retention_days (global default + per-paciente override). Update per-paciente retention_days. Archive job stub (Edge Function `archive-tomas` with SQL definition but feature-flagged off in v1). Hard-delete job stub similarly flagged.
- **Files**: `src/features/retention/routes.tsx`, `src/features/retention/RetentionSettings.tsx`, `src/features/retention/hooks.ts`, `src/lib/repositories/retention.ts`, `supabase/functions/archive-tomas/index.ts` (stub).
- **Acceptance**: View global default (730 days). Create per-paciente override. Update override. Archive and hard-delete functions exist but are NOT scheduled (commented-out cron).
- **Estimate**: ~200 lines.
- **Depends on**: T-009 (pacientes), T-004 (retention_policies table).
- **PR boundary**: chained-pr (PR 6 / 1).
- **Verification**: `pnpm vitest run src/features/retention/`. Manual: set retention to 1 day → verify no immediate archival (job is disabled).

### Task T-022: Implement reports (PDF + share link)

- **Scope**: PDF generation via `@react-pdf/renderer` in Web Worker (off main thread). Report content: paciente info, active meds, schedules, tomas for date range, adherence chart. Share link: upload JSON blob to Supabase Storage, generate 7-day signed URL. Read-only `/share/:token` viewer (no auth required).
- **Files**: `src/workers/pdf.worker.ts`, `src/features/reports/routes.tsx`, `src/features/reports/ReportForm.tsx`, `src/features/reports/PDFViewer.tsx`, `src/features/reports/ShareLink.tsx`, `src/features/reports/ShareViewer.tsx`, `src/features/reports/hooks.ts`, `src/lib/repositories/reports.ts`.
- **Acceptance**: PDF renders correct content for date range. Download triggers via `<a download>`. Share link uploaded to Storage. Signed URL works for 7 days. `/share/:token` renders JSON data without auth.
- **Estimate**: ~350 lines.
- **Depends on**: T-009 (pacientes), T-010 (medications), T-013 (tomas data), T-017 (adherence chart).
- **PR boundary**: chained-pr (PR 6 / 2).
- **Verification**: Generate PDF for 7-day range → verify content. Generate share link → open in incognito → verify data renders.

### Task T-023: Implement travel-adjustment UI

- **Scope**: TZ change flow: update paciente's `timezone_id`, future tomas recomputed in new TZ, historical tomas keep original TZ, UI shows both. Per-trip manual shift: create a `patient_trip_adjustments` record with ±N hours for a date range, recorded as audit row. Trip shifts temporarily override schedule times.
- **Files**: `src/features/travel/routes.tsx`, `src/features/travel/TZChangeForm.tsx`, `src/features/travel/TripShiftForm.tsx`, `src/features/travel/hooks.ts`, `src/lib/repositories/travel.ts`.
- **Acceptance**: Change patient TZ → future tomas use new TZ. Historical tomas display original TZ. Create trip shift → schedule times shift by ±N for trip duration. Trip end → schedule reverts.
- **Estimate**: ~250 lines.
- **Depends on**: T-009 (pacientes timezone_id), T-011 (schedules), T-013 (tomas).
- **PR boundary**: chained-pr (PR 6 / 2).
- **Verification**: Change paciente TZ from `America/Buenos_Aires` to `Europe/Madrid` → verify future `scheduled_at` shifts. Create trip shift +3h → verify schedule display shifts.

### Task T-024: Implement closed-temporada reopen flow (Q5=C)

- **Scope**: Add `temporada_reopen_audit` table (temporada_id FK, user_id, reason text NOT NULL, modified_at, modified_fields jsonb). Amend immutability trigger: allow modifications if closed_at IS NULL OR closed_at > now() - 90 days OR a reopen_audit reason is being stored. UI: "Reabrir con razón" button on closed temporadas > 90 days old. Reason capture modal. Audit log view for cuidador_principal.
- **Files**: `supabase/migrations/0001_init.sql` (amend with temporada_reopen_audit + updated trigger), `src/features/plans/ReopenModal.tsx`, `src/features/plans/ReopenAuditLog.tsx`, `src/features/plans/hooks.ts` (amend), `src/lib/repositories/temporadas.ts` (amend).
- **Acceptance**: Closed temporada <90 days → immutable (DB trigger blocks). Closed temporada >90 days → "Reabrir con razón" button shown. Clicking opens reason modal. Submitting inserts `temporada_reopen_audit` row + allows modification. Audit log shows all reopen events.
- **Estimate**: ~300 lines.
- **Depends on**: T-012 (temporadas CRUD), T-004 (migration base).
- **PR boundary**: chained-pr (PR 6 / 3).
- **Verification**: Close temporada → try to modify <90 days → error. Set temporada closed_at to 91 days ago → reopen with reason → modification succeeds. Verify audit log.

## Phase 8: Settings & Polish

### Task T-025: Implement notification_settings UI

- **Scope**: Per-paciente notification settings: toggle each channel (in_app, email, sms). Per-medication override: disable notifications for a specific med. Default: all channels ON (in_app always on; email/SMS off until credentials configured). UI shows which channels are available based on env vars.
- **Files**: `src/features/settings/routes.tsx`, `src/features/settings/NotificationSettings.tsx`, `src/features/settings/MedicationOverrideList.tsx`, `src/features/settings/hooks.ts`, `src/lib/repositories/notifications.ts`.
- **Acceptance**: Toggle channels per paciente. Disable notifications for one medication. Changes persist. Env-var detection grays out unavailable channels.
- **Estimate**: ~200 lines.
- **Depends on**: T-009 (pacientes), T-010 (medications), T-004 (notification_settings table).
- **PR boundary**: chained-pr (PR 7 / 1).
- **Verification**: `pnpm vitest run src/features/settings/`. Manual: toggle channels, verify no notifications fire for disabled channels.

### Task T-026: Implement iOS PWA status badge + dashboard banner

- **Scope**: Dashboard banner showing today's pending tomas sorted by time (primary fallback for iOS). Notification reliability status indicator: green (likely delivered), yellow (iOS — in-app only), red (permission denied). Detect iOS PWA via user agent or `navigator.standalone`.
- **Files**: `src/features/reminders/StatusBadge.tsx`, `src/features/reminders/DashboardBanner.tsx`, `src/features/dashboard/routes.tsx`.
- **Acceptance**: Dashboard shows pending tomas list. Green badge when SW notification likely works. Yellow badge on iOS PWA. Red badge when permission denied. Banner updates on new toma insert via Realtime.
- **Estimate**: ~150 lines.
- **Depends on**: T-015 (SW notifications), T-013 (tomas data).
- **PR boundary**: chained-pr (PR 7 / 1).
- **Verification**: Manual: open on Chrome desktop → green badge. Open on iOS Safari → yellow badge. Deny notification permission → red badge.

### Task T-027: Implement settings page

- **Scope**: Settings page with: theme toggle (light/dark), locale (Spanish only for v1, but structure for future i18n), vacation defaults (default duration), retention default display, account info (email, role), logout button.
- **Files**: `src/features/settings/SettingsPage.tsx`, `src/features/settings/hooks.ts`.
- **Acceptance**: Theme toggle persists. Account info shows current user. Logout works. All settings scoped to current user.
- **Estimate**: ~150 lines.
- **Depends on**: T-007 (auth), T-006 (shell).
- **PR boundary**: chained-pr (PR 7 / 1).
- **Verification**: Manual: toggle theme → verify dark mode persists on reload. Logout → redirected to `/login`.

## Phase 9: Tests & Config

### Task T-028: Set up Vitest and write unit tests

- **Scope**: Add `vitest.config.ts` with jsdom environment, `@testing-library/jest-dom` setup. `tests/setup.ts` with IDB polyfill. First unit tests: `lib/time/formatInTz.test.ts`, `lib/outbox/outbox.test.ts`, `lib/validation/schemas.test.ts`, `lib/repositories/tomas.test.ts` (state machine transitions).
- **Files**: `vitest.config.ts`, `tests/setup.ts`, `tests/unit/time.test.ts`, `tests/unit/outbox.test.ts`, `tests/unit/validation.test.ts`, `tests/unit/tomas-state.test.ts`.
- **Acceptance**: `pnpm test` runs all tests. Coverage on `lib/` reported. Format functions tested. Outbox enqueue/replay tested. Validation schemas reject invalid payloads. State machine transitions correct.
- **Estimate**: ~200 lines.
- **Depends on**: T-005 (lib/ exists).
- **PR boundary**: chained-pr (PR 7 / 2).
- **Verification**: `pnpm vitest run --reporter=verbose` — all green.

### Task T-029: Set up Playwright and write E2E + RLS tests

- **Scope**: Add `playwright.config.ts`. E2E tests: login flow, paciente CRUD, medication + schedule CRUD, toma lifecycle, offline outbox (disable network), PDF export. RLS contract test (`tests/e2e/rls.spec.ts`): sign in as user A, attempt SELECT/INSERT/UPDATE/DELETE on every table for rows belonging to user B — any success fails the build.
- **Files**: `playwright.config.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/pacientes.spec.ts`, `tests/e2e/medications.spec.ts`, `tests/e2e/tomas.spec.ts`, `tests/e2e/offline.spec.ts`, `tests/e2e/rls.spec.ts`.
- **Acceptance**: Login E2E passes. CRUD flows work. Offline: log toma offline → reconnect → verify sync. RLS: all cross-user operations return 403/empty (no data leak). PDF export generates file.
- **Estimate**: ~400 lines (at limit).
- **Depends on**: T-007 (auth for test users), T-009 (pacientes), T-010 (meds), T-013 (tomas), T-022 (PDF).
- **PR boundary**: chained-pr (PR 7 / 2).
- **Verification**: `pnpm playwright test --reporter=list` — all green, especially `rls.spec.ts`.

### Task T-030: Flip strict_tdd and update testing capabilities

- **Scope**: Set `testing.strict_tdd: true` in `openspec/config.yaml`. Set `apply.test_command` and `verify.test_command` to `pnpm vitest run`. Update Engram observation 157 (testing-capabilities) with Vitest + Playwright runner details.
- **Files**: `openspec/config.yaml`.
- **Acceptance**: Config reflects strict TDD mode. `test_command` is `pnpm vitest run`. Engram obs 157 shows Vitest + Playwright.
- **Estimate**: ~5 lines.
- **Depends on**: T-028 (Vitest working).
- **PR boundary**: chained-pr (PR 7 / 2).
- **Verification**: `grep "strict_tdd" openspec/config.yaml` shows `true`.

## Phase 10: Cleanup

No separate cleanup phase. Each work unit above includes its own tests and code. The PR boundaries ensure each slice is independently shippable.
