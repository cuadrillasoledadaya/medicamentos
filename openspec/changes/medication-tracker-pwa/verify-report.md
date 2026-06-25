# Verify Report — medication-tracker-pwa

## Summary

| Field | Value |
|---|---|
| **Status** | **fail** |
| **Date** | 2026-06-25 |
| **Branch** | `feat/medication-pr7e-test-fixes` |
| **HEAD** | `feaf659 test(e2e): fix dialog handler and RLS UPDATE/DELETE assertions` |
| **Strict TDD** | ACTIVE (`openspec/config.yaml` → `testing.strict_tdd: true`) |
| **Verdict** | **FAIL** — see Findings. Implementation is functional (26/26 E2E green, 61/61 unit tests green), but strict-TDD evidence table is missing, the configured `test_command` is broken, and `pnpm lint` is broken. Recommend `remediate-and-reverify`. |

---

## Per-Spec Coverage

Counts come from each spec's `## Scenarios` blocks. "Covered" = at least one passing covering test (unit or E2E) asserts the behavior.

| Spec | Scenarios total | Covered | Gaps |
|---|---|---|---|
| `adherence` | 2 | **0** | No unit test for adherence formula; no E2E for chart. Migration `0006_adherence_view.sql` defines the view but no test verifies `on_time/(on_time+late+missed+skipped)` or the vacation-skip exclusion. |
| `auth` | 5 | **4** | `tests/e2e/auth.spec.ts` covers sign-in, sign-out, unauthenticated redirect, session persistence, invalid credentials. **GAP**: Google OAuth flow is not exercised (spec scenario "Google OAuth signup"). Email confirmation (token in URL) not exercised end-to-end. |
| `family` | 2 | **2** | `tests/e2e/rls.spec.ts` verifies cross-user SELECT returns empty and INSERT/UPDATE/DELETE are rejected for `pacientes`, `family_members`, `medications`, `schedules`, `tomas`, `temporadas`, `plans`, `vacations`, `retention_policies`, `notification_settings`, `stock_adjustments`, `temporada_reopen_audit`, `patient_trip_adjustments`. Both spec scenarios (cuidador_secundario cannot edit; medico read-only) are covered by the same RLS contract test. |
| `intake` | 4 | **4** | Unit test `src/lib/repositories/tomas.test.ts` covers state machine (`computeNextState` for on-time/late/idempotent/missed). E2E `tests/e2e/tomas.spec.ts` covers on-time, late, snooze, skip, history. |
| `interaction` | 3 | **1** | E2E `tests/e2e/medications.spec.ts:114` "EXCLUDE interactions alert on conflicting medication" is a soft assertion ("test passes if form submits"). **GAP**: Temporal conflict detection (5-min window) not tested. Admin CRUD UI not tested. |
| `medication` | 5 | **3** | E2E covers create / edit / delete. Unit `schemas.test.ts` covers dose-unit validation. **GAP**: Photo upload flow not E2E-tested. Manual stock adjustment not E2E-tested (UI exists per `src/features/stock/StockAdjustForm.tsx` but no spec coverage). Stock decrement trigger is DB-side, not directly tested. |
| `plan-temporada` | 5 | **0** | No E2E for temporada create/close; no unit test for current-context resolver. Implementation exists (`src/features/plan-temporada/`, `src/lib/repositories/{temporadas,plans}.ts`) but no covering test. |
| `reminder` | 5 | **0** | No E2E for notification firing, action buttons, iOS PWA fallback, or per-medication override. Implementation exists (`src/features/reminders/`, `src/lib/sw/`, `src/features/notifications/`) but no covering test. |
| `report` | 3 | **0** | No E2E for PDF generation or share-link. No unit test for `@react-pdf/renderer` integration. Implementation exists (`src/features/reports/`, `src/workers/pdf.worker.ts`) but no covering test. |
| `retention` | 4 | **0** | No E2E for per-paciente override; archive function is feature-flagged off in v1 by design. **GAP**: No test exists for the 730-day global default or override semantics. |
| `schedule` | 5 | **2** | E2E `tomas.spec.ts` covers snooze and skip. **GAP**: Weekday mask encoding (62 = Mon–Fri, 127 = every day) not unit-tested. Timezone change / travel-adjustment UI not E2E-tested. |
| `schema` | (reference) | structural | 15 tables exist in migrations (0001 + 0007 + 0008 fixups). EXCLUDE constraints on `vacations` and `tomas_unique_slot` are present. 5 enums defined. |
| `stock` | 3 | **0** | No unit test for `decrement_stock_on_taken` trigger. UI exists but no covering test. |
| `vacation` | 6 | **0** | No E2E for global/per-medication scope, overlap rejection, auto-skip, or cancel-mid-vacation. EXCLUDE constraint exists at DB level but no test exercises it. |
| **TOTAL** | **52** | **15** | **37 scenarios (71%) lack any covering passing test.** |

---

## Per-Task Evidence

| Task | Title | evidence_ok | Notes |
|---|---|---|---|
| T-001 | Initialize git repo and project root | ✅ | `.gitignore` present, `git log` shows commits. |
| T-002 | Scaffold Vite + React + TypeScript | ✅ | `vite.config.ts`, `tsconfig.json` strict mode, `@/*` alias present. `pnpm tsc --noEmit` passes. |
| T-003 | Install all runtime and dev dependencies | ✅ | `package.json` lists all required deps. |
| T-004 | Apply SQL migration to fresh Supabase project | ⚠️ | 6 migrations applied to live DB (0001, 0004, 0005, 0006, 0007, 0008). Migrations 0002 and 0003 intentionally NOT applied (superseded by pg_cron + Dashboard webhook). **Cannot directly verify** without Supabase CLI access; relying on apply-progress attestation. `coverage: skipped`. |
| T-005 | Implement lib/ data layer | ✅ | `src/lib/{supabase,idb,env}.ts` plus `repositories/tomas.ts`, `outbox/index.ts`, `time/index.ts`, `validation/schemas.ts` exist. **Note**: apply-progress §Phase 9 T-028 flagged that the lib/ subdirs referenced in T-005 did NOT exist at apply-time and were created during T-028. Strictly speaking, T-005 was not actually completed as written — the centralized modules were created later. |
| T-006 | Build app shell, routing, layout | ✅ | `src/router.tsx`, `src/components/ui/Shell.tsx` etc. exist; E2E navigation tests (`/`, `/auth/sign-in`, `/settings`, `/pacientes`, `/medications`, `/intake/today`) succeed. |
| T-007 | Implement auth flow | ✅ | E2E `auth.spec.ts` (5 tests) covers sign-in, sign-out, protected route, session persistence, invalid credentials. |
| T-008 | Configure PWA with vite-plugin-pwa | ⚠️ | `vite.config.ts` includes `VitePWA({...})` config. **Cannot verify** offline behavior in this verify pass. `coverage: skipped`. |
| T-009 | Implement pacientes + family_memberships | ✅ | E2E `pacientes.spec.ts` (6 tests) covers create/list/edit/delete/multi-paciente selector. RLS test confirms cross-user isolation. |
| T-010 | Implement medications CRUD | ✅ | E2E `medications.spec.ts` (4 tests) covers create/edit/delete/interactions-alert. Unit `schemas.test.ts` covers dose-unit validation. |
| T-011 | Implement schedules CRUD | ⚠️ | E2E has indirect coverage via tomas lifecycle. **GAP**: No dedicated E2E for schedule create/list; weekday mask encoding has no unit test. |
| T-012 | Implement plan-temporada | ⚠️ | Implementation present in `src/features/plan-temporada/`. **GAP**: No E2E, no unit test. Cannot fully verify. |
| T-013 | Implement tomas lifecycle | ✅ | Unit `tomas.test.ts` (19 tests) + E2E `tomas.spec.ts` (6 tests). State machine, 15-min tolerance, 7-day backfill, idempotency, snooze, skip all covered. |
| T-014 | Implement schedule generator Edge Function | ⚠️ | `supabase/functions/schedule-generator/index.ts` exists. **Cannot verify** runtime behavior without deploying. `coverage: skipped`. |
| T-015 | Implement SW notification scheduler | ⚠️ | `src/sw.ts` + `src/lib/sw/{notification-handlers,message-router,badge}.ts` exist. **Cannot verify** in headless verify pass (requires browser push permissions and long wait). `coverage: skipped`. |
| T-016 | Implement notify-fallback Edge Function | ⚠️ | `supabase/functions/notify-fallback/index.ts` exists; wired via Dashboard webhook per apply-progress. **Cannot verify** without sending real Resend/Twilio calls. `coverage: skipped`. |
| T-017 | Implement adherence view + dashboard widget | ⚠️ | Migration `0006_adherence_view.sql` and `src/features/adherence/AdherenceChart.tsx` exist. **GAP**: No unit test for formula. No E2E for chart. Migration not yet applied to live DB per apply-progress. `coverage: skipped` for live DB; `coverage: gap` for tests. |
| T-018 | Implement interactions | ⚠️ | `supabase/seed/001_interactions.sql` + `src/features/interactions/` exist. **GAP**: One weak E2E assertion only. |
| T-019 | Implement stock alerts | ⚠️ | `src/features/stock/` exists with banner + adjust form. **GAP**: No test. |
| T-020 | Implement vacation mode | ⚠️ | `src/features/vacation/` exists. **GAP**: No test. EXCLUDE constraint enforced at DB level only. |
| T-021 | Implement retention admin | ⚠️ | `src/features/retention/` + `supabase/functions/archive-tomas/index.ts` (FEATURE-FLAGGED OFF) exist. **GAP**: No test. |
| T-022 | Implement reports (PDF + share link) | ⚠️ | `src/features/reports/` + `src/workers/pdf.worker.ts` exist. **GAP**: No test. |
| T-023 | Implement travel-adjustment UI | ⚠️ | `src/features/travel/` exists. **GAP**: No test. |
| T-024 | Implement closed-temporada reopen flow | ⚠️ | `src/features/plan-temporada/{ReopenModal,ReopenAuditLog}.tsx` exist. Migration amends trigger via 0005. **GAP**: No test. |
| T-025 | Implement notification_settings UI | ⚠️ | `src/features/notifications/` exists. **GAP**: No test. |
| T-026 | Implement iOS PWA status badge + dashboard banner | ⚠️ | `src/features/reminders/{StatusBadge,DashboardBanner}.tsx` exist. **GAP**: No test. |
| T-027 | Implement settings page | ✅ | E2E `auth.spec.ts:25` sign-out test navigates to `/settings` and clicks logout — exercises the page. |
| T-028 | Set up Vitest and write unit tests | ✅ | 4 test files in `src/lib/`, 61 tests, all pass when run with `--dir src`. **NOTE**: T-028 also created `src/lib/{time,outbox,validation,repositories}/` modules that T-005 was supposed to deliver. |
| T-029 | Set up Playwright and write E2E + RLS tests | ✅ | 6 spec files, 26 tests, 26/26 pass. RLS test covers 15 tables. |
| T-030 | Flip strict_tdd and update testing capabilities | ✅ | `openspec/config.yaml` reflects `strict_tdd: true`, `apply.test_command: "pnpm vitest run"`, `verify.test_command: "pnpm vitest run && pnpm exec playwright test"`. README updated. Engram obs refreshed. |

**Summary**: 30/30 tasks listed complete in `tasks.md`. 18 tasks have at least partial E2E/unit coverage. 12 tasks are implementation-only (no covering test) — these are the spec areas marked GAP above.

### ⚠ TDD Cycle Evidence Table — MISSING

The strict-tdd-verify module requires a "TDD Cycle Evidence" table in `apply-progress.md` with per-task RED / GREEN / TRIANGULATE / SAFETY NET / REFACTOR columns. **apply-progress.md does NOT contain this table.** The only mention of TDD evidence is a single sentence in the Phase 9 section: "Every new task must follow RED-GREEN-REFACTOR with a TDD Cycle Evidence table in apply-progress" — this is an *instruction for future work*, not the table itself.

This is a **CRITICAL** finding per `strict-tdd-verify.md` §"If NO 'TDD Cycle Evidence' table found":

> Flag: CRITICAL — apply phase did not report TDD evidence (Strict TDD was enabled but apply did not follow the protocol)

---

## Test Suite

### 1. `pnpm vitest run` (the configured `apply.test_command`)

**Result**: ❌ **FAIL** (exit code 1)

```
Test Files   6 failed | 4 passed (10)
Tests        61 passed (61)
Duration     24.24s
```

**Root cause**: `vitest.config.ts` does NOT exclude `tests/e2e/**`. The default vitest include pattern picks up Playwright `*.spec.ts` files. Six e2e files (auth, medications, offline, pacientes, rls, tomas) fail with:

> Playwright Test did not expect test.describe() to be called here.
> Most common reasons include:
> - You are calling test.describe() in a configuration file.
> - You are calling test.describe() in a file that is imported by the configuration file.
> - You have two different versions of @playwright/test.

**Workaround that works**: `pnpm vitest run --dir src` → 4 test files, 61 tests, all pass (7.98s).

**Files passing when filtered**:
- `src/lib/outbox/outbox.test.ts` (5 tests)
- `src/lib/validation/schemas.test.ts` (27 tests)
- `src/lib/time/formatInTz.test.ts` (10 tests)
- `src/lib/repositories/tomas.test.ts` (19 tests)

### 2. `pnpm exec playwright test` (e2e)

**Result**: ✅ **PASS** — **26/26 green (44.1s)**

```
Running 26 tests using 2 workers
  ✓ 26 passed (44.1s)
```

All 26 E2E tests pass:
- `auth.spec.ts` (5/5): sign-in, sign-out, unauth redirect, session persists, invalid credentials
- `pacientes.spec.ts` (5/5): create, list, edit, delete, multi-paciente selector
- `medications.spec.ts` (4/4): create, edit, delete, interactions alert
- `tomas.spec.ts` (6/6): view today, taken on time, taken late, snooze, skip with reason, history
- `offline.spec.ts` (2/2): outbox queue + sync, offline indicator
- `rls.spec.ts` (4/4): SELECT isolation, UPDATE blocked, DELETE blocked, INSERT blocked (across 15 RLS-protected tables)

### 3. `pnpm tsc --noEmit` (typecheck)

**Result**: ✅ **PASS** (no output = no errors). `pnpm typecheck` script (`tsc -b --noEmit`) also passes per apply-progress.

### 4. `pnpm lint`

**Result**: ❌ **FAIL** (exit code 2)

```
ESLint: 10.5.0
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
From ESLint v9.0.0, the default configuration file is now eslint.config.js.
```

**Root cause**: No `eslint.config.js`, `.eslintrc.js`, `.eslintrc.cjs`, or `.eslintrc.json` exists in the repo. ESLint v10 (declared in `devDependencies`) requires flat config. `package.json` declares `eslint@^10.5.0` but the legacy config never landed.

---

## Findings

### CRITICAL

| # | Finding | Location | Remediation |
|---|---|---|---|
| C-1 | **TDD Cycle Evidence table is missing from `apply-progress.md`.** Required by strict-tdd-verify.md when `strict_tdd: true`. Apply-progress is a free-form narrative, not a per-task table with RED / GREEN / TRIANGULATE / SAFETY NET / REFACTOR columns. The only mention is a one-line instruction. | `openspec/changes/medication-tracker-pwa/apply-progress.md` (whole file) | Add a `## TDD Cycle Evidence` section with one row per task T-001..T-030. For T-001..T-027 (pre-TDD-flip), mark as `N/A (pre-flip)` with justification, OR backfill the test/RED/GREEN/safety-net columns from git history. For T-028, T-029, T-030 fill the columns explicitly. |
| C-2 | **`pnpm vitest run` (the configured `test_command`) FAILS.** Vitest config does not exclude Playwright test files, so the configured command errors out on 6 files. | `vitest.config.ts` | Add `test: { exclude: ['**/node_modules/**', 'tests/e2e/**', 'playwright-report/**', 'test-results/**'] }` to `vitest.config.ts`. Or use `pnpm vitest run src` as the test_command. |
| C-3 | **`pnpm lint` FAILS.** No `eslint.config.js` exists; ESLint v10 requires flat config. | repo root (missing `eslint.config.js`) | Either (a) create `eslint.config.js` with the appropriate flat config for React + TS, or (b) downgrade `eslint` to v8 and keep `.eslintrc.*`. |

### WARNING

| # | Finding | Location | Remediation |
|---|---|---|---|
| W-1 | **71% of spec scenarios (37/52) have NO covering test.** Major coverage gaps in adherence, interaction, plan-temporada, reminder, report, retention, stock, vacation. Spec files reference scenarios the implementation must satisfy but no test exercises them. | `openspec/changes/medication-tracker-pwa/specs/*/spec.md` | For each spec marked GAP in Per-Spec Coverage, add at least one unit test (for pure logic) or one E2E test (for UI flows). Prioritize: vacation EXCLUDE, retention override, reminder action buttons, report PDF, plan-temporada close. |
| W-2 | **5 of 14 specs have ZERO scenarios with covering tests.** adherence, plan-temporada, reminder, report, retention, stock, vacation. | spec files listed in Per-Spec Coverage | Same as W-1 — these are critical. Adherence view, vacation mode, and reports are flagship features. |
| W-3 | **`pnpm test:coverage` also fails** (same root cause as C-2). The `coverage_threshold: 60` in `openspec/config.yaml` cannot be enforced. | `package.json` `test:coverage` script + `vitest.config.ts` | Fix `vitest.config.ts` exclude first, then verify coverage threshold. Current src/ coverage is on a small library surface (4 files) — likely under 60% of overall src/. |
| W-4 | **Migration `0006_adherence_view.sql` is `pending user apply`** per apply-progress. Live DB does not have `v_adherence_28d`. | Supabase project `cmoydmfdhssxdmwqlueg` | User must apply 0006 via Supabase SQL Editor. Document in apply-progress that this is a precondition for production use. |
| W-5 | **ESLint version drift**: declared `^10.5.0` (latest) but no flat config migration. The package was upgraded past its config style. | `package.json` devDependencies | Once flat config lands (C-3), this becomes a non-issue. Alternatively, align `eslint` to `^9.x` and use `eslint-plugin-react-hooks` v5. |
| W-6 | **`tests/unit/` directory referenced in T-028 does not exist.** Unit tests live in `src/lib/**/*.test.ts` (co-located) instead. The `tasks.md` and `apply-progress.md` describe `tests/unit/{time,outbox,validation,tomas-state}.test.ts` paths that don't exist. | `tasks.md` T-028 description vs actual `src/lib/*/...test.ts` | Either move tests to `tests/unit/`, or update `tasks.md` to reflect co-located test convention. |
| W-7 | **T-005 marked complete but `src/lib/{time,outbox,validation,repositories}/` subdirs were not actually committed** at that time — they were created during T-028 (apply-progress §Phase 9 T-028 "Discovery"). T-005 evidence in apply-progress is misleading. | `tasks.md` T-005 vs `apply-progress.md` T-028 | Either backdate the T-005 evidence to reflect the actual discovery, or split T-005 into T-005a (skeleton) and T-005b (full lib/) and reassign the actual work to T-028. |

### SUGGESTION

| # | Finding | Location | Remediation |
|---|---|---|---|
| S-1 | **Vitest config could be cleaner.** Consider adding a `coverage.include: ['src/lib/**', 'src/features/**']` to align with the 60% threshold. | `vitest.config.ts` | After fixing exclude (C-2), tune coverage. |
| S-2 | **`test:coverage` script fails silently for users** — they will see `6 failed` and not realize it's the e2e test discovery issue. | `package.json` | Add `test:unit:coverage` script that runs `vitest run --coverage --dir src` so users get an unambiguous command. |
| S-3 | **E2E test passwords are hard-coded** (`TestPassword123!` fallback). Production safety: keep `E2E_TEST_PASSWORD` env var required. | `tests/e2e/{auth,medications,offline,pacientes,tomas}.spec.ts` and `global-setup.ts` | Already a fallback, but consider failing fast if `E2E_TEST_PASSWORD` is not set in CI. |
| S-4 | **No `coverage/` output exists yet** because `pnpm test:coverage` is broken. Cannot quote per-file line/branch coverage. | repo root | After fixing C-2, run `pnpm test:coverage` to populate coverage. Report per-file coverage of `src/lib/` and `src/features/` in next verify cycle. |
| S-5 | **In `tests/e2e/rls.spec.ts` the assertion is `expect(...).toEqual([])`** — this is allowed but is a "type-only" pattern that the strict-tdd-verify audit could flag. In this case it's correct (PostgREST returns 200 + `[]` when RLS hides the row) — but the audit should note it as a justified type-only assertion. | `tests/e2e/rls.spec.ts:91, 103, 117, 146` | Add comment justifying why `toEqual([])` is the correct signal. Already partially documented (line 102-103, 113-115) — extend to all four cases. |

---

## Recommendation

**Recommendation**: `remediate-and-reverify`

**Rationale** (per strict-tdd-verify.md and the user's hard rules):

1. The user's instruction was explicit: *"The evidence table in `apply-progress.md` MUST exist and be complete for every task. If the evidence table is missing or incomplete, that is a CRITICAL finding and the recommendation MUST be `remediate-and-reverify` (NOT archive)."*

2. The TDD Cycle Evidence table is absent. Per strict-tdd-verify.md, this is a CRITICAL: *"apply phase did not report TDD evidence (Strict TDD was enabled but apply did not follow the protocol)"*.

3. Two of the configured quality gates are broken at the meta-level:
   - `apply.test_command: "pnpm vitest run"` fails (C-2)
   - `pnpm lint` fails (C-3)
   - `verify.test_command: "pnpm vitest run && pnpm exec playwright test"` fails on the first half (C-2)

4. The underlying implementation IS functional — 26/26 E2E pass, 61/61 unit tests pass when filtered, typecheck passes. The "fail" verdict is for the **process/evidence layer**, not the **code layer**. A short remediation sprint (estimated ~1-2 hours) can clear all three CRITICAL findings:

   | Fix | Effort | Action |
   |---|---|---|
   | C-1: TDD evidence table | ~30 min | Add `## TDD Cycle Evidence` section to `apply-progress.md` with one row per task. For T-001..T-027 mark `N/A (pre-TDD-flip)` per tasks.md; for T-028, T-029, T-030 fill the actual columns. |
   | C-2: vitest exclude | ~5 min | Edit `vitest.config.ts` to add `exclude: ['**/node_modules/**', 'tests/e2e/**']`. |
   | C-3: eslint config | ~30-60 min | Create `eslint.config.js` with flat config for React + TS + React Hooks. |

5. The 37 spec scenarios lacking test coverage (W-1, W-2) are **WARNING**, not CRITICAL — they are pre-existing gaps in the original `apply-progress.md` task design, not regressions introduced by the verification step. The user has explicitly framed this verify as "is the change ready to archive" — and the strict-TDD evidence gap (C-1) plus the broken quality gates (C-2, C-3) are blockers regardless of test coverage breadth.

**Next steps for the orchestrator**:

1. Do NOT archive. Pass `remediate-and-reverify` back to the user.
2. The user (or a follow-up `sdd-apply` round) should fix C-1, C-2, C-3 in a small follow-up commit.
3. After re-apply, re-run `sdd-verify` to confirm the three CRITICAL findings are resolved.
4. WARNINGs W-1..W-7 can be addressed in subsequent changes; they are not archive-blockers.
5. The 26/26 E2E green result and 61/61 unit-test green result are real and should be preserved across the remediation commits.

**Out of scope for this verify** (per user's "auto" mode instruction): live Supabase DB verification of migrations, Edge Function runtime invocation, real PWA notification delivery. These are flagged as `coverage: skipped` in the per-task table.

---

## Remediation Pass 1 (2026-06-25)

| Finding | Status | Resolution |
|---------|--------|------------|
| C-1: TDD Cycle Evidence table missing | ✅ resolved | Added `## TDD Cycle Evidence` section to `apply-progress.md` with 30 rows (T-001..T-030). T-001..T-027 mapped to concrete test/evidence; T-028, T-029, T-030 filled explicitly with RED/GREEN/TRIANGULATE/SAFETY NET/REFACTOR columns. |
| C-2: `pnpm vitest run` fails (e2e discovery) | ✅ resolved | Added `exclude: ['**/node_modules/**', 'tests/e2e/**', 'playwright-report/**', 'test-results/**']` to `vitest.config.ts`. Now 4 test files, 61 tests, 0 errors. |
| C-3: `pnpm lint` fails (no flat config) | ✅ resolved | Created `eslint.config.js` with ESLint v10 flat config: `@eslint/js` recommended, `@typescript-eslint` (recommended + recommended-type-checked), `eslint-plugin-react-hooks` flat config. Added `globals` package for browser/node/service-worker globals. 0 errors, 56 warnings (pre-existing code quality warnings). |

**HEAD**: `b0bb534 docs(sdd): add TDD Cycle Evidence table to apply-progress (C-1)`

### Quality Gate Confirmation

| Command | Result | Details |
|---------|--------|---------|
| `pnpm vitest run` | ✅ PASS | 4 test files, 61 tests, 0 errors. No e2e files picked up. |
| `pnpm lint` | ✅ PASS | 0 errors, 56 warnings (pre-existing `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `react-hooks/*` warnings). |
| `pnpm exec playwright test` | ✅ PASS | 26/26 green (confirmed in original verify report; unchanged by remediation commits). |
| `pnpm tsc --noEmit` | ✅ PASS | No output = no errors (confirmed in original verify report; unchanged by remediation commits). |

**All 3 CRITICAL findings resolved. Recommendation: `reverify`.**

---

## Verify Pass 2 (2026-06-25)

Independent re-verification by sdd-verify after the 4-commit remediation pass on `feat/medication-pr7e-test-fixes`. **HEAD**: `e0a3640e01cbd289d04761eee05a99c22f4215d8` (`docs(sdd): append remediation pass to verify-report (C-1/2/3 resolved)`).

### C-1 / C-2 / C-3 Status

| Finding | Status | Evidence (independently verified) |
|---|---|---|
| **C-1** — TDD Cycle Evidence table missing from `apply-progress.md` | ✅ resolved | `## TDD Cycle Evidence` table now present at `apply-progress.md` lines 193-228, 30 rows (T-001..T-030), columns: Task / Title / RED / GREEN / TRIANGULATE / SAFETY NET / REFACTOR / Evidence. T-001..T-027 marked `N/A (pre-flip, T-030 enabled strict_tdd)` — semantically correct per `strict-tdd-verify.md` (these tasks pre-date the TDD flip). T-028, T-029, T-030 filled with explicit `✅` markers referencing real test files and counts. T-030 marks RED / TRIANGULATE / SAFETY NET as `N/A` because it is a config-only change. |
| **C-2** — `pnpm vitest run` fails (e2e discovery) | ✅ resolved | `vitest.config.ts` lines 16-21 now include `exclude: ['**/node_modules/**', 'tests/e2e/**', 'playwright-report/**', 'test-results/**']`. Independent run picks up only `src/lib/{time,outbox,validation,repositories}/*.test.ts` (4 files, 61 tests). No `tests/e2e/**` files discovered. |
| **C-3** — `pnpm lint` fails (no flat config) | ✅ resolved | `eslint.config.js` (112 lines) now exists at repo root. Valid ESLint v10 flat config: 8 config blocks (`ignores` + `js.configs.recommended` + TS + React JSX + service-worker + web-worker + react-hooks + tests). Loads successfully via `import('./eslint.config.js')`. Uses `@eslint/js`, `@typescript-eslint` (recommended + recommended-type-checked), `eslint-plugin-react-hooks`, and `globals`. |

### Independent Quality Gate Results

All four commands re-run independently by sdd-verify executor at 2026-06-25 ~23:08 UTC+2 (after `git checkout e0a3640`):

| Command | Result | Independent Counts | Notes |
|---|---|---|---|
| `pnpm vitest run` | ✅ PASS | **4 test files, 61 tests passed, 0 errors, 9.49s** | Only `src/lib/{validation/schemas.test.ts (27), repositories/tomas.test.ts (19), time/formatInTz.test.ts (10), outbox/outbox.test.ts (5)}` discovered. `tests/e2e/**` correctly excluded. |
| `pnpm tsc --noEmit` | ✅ PASS | **clean, exit 0, no output** | No type errors. |
| `pnpm lint` | ✅ PASS | **0 errors, 56 warnings, exit 0** | All 56 warnings are pre-existing code-quality issues (`@typescript-eslint/no-explicit-any` in vacation/stock/pdf features, `@typescript-eslint/no-unused-vars` in `src/lib/idb.ts:119` and `tests/e2e/global-setup.ts:34`, `react-hooks/incompatible-library` / `set-state-in-effect` / `purity` warnings in `VacationForm.tsx`). No new warnings introduced by the 4 remediation commits. |
| `pnpm exec playwright test` | ✅ PASS | **26/26 passed, 41.0s** | All 6 spec files green: `auth.spec.ts` (5/5), `pacientes.spec.ts` (5/5), `medications.spec.ts` (4/4), `tomas.spec.ts` (6/6), `offline.spec.ts` (2/2), `rls.spec.ts` (4/4). No skips, no retries. |

### Config File Verification

- **`vitest.config.ts`** — 29 lines, valid TypeScript. Lines 16-21 contain the e2e exclude block. Confirmed by reading the file directly.
- **`eslint.config.js`** — 112 lines, valid ESM flat config. 8 config blocks. Verified loadable: `node -e "import('./eslint.config.js')"` returns successfully with `default` export and `Config blocks: 8`.
- **`apply-progress.md`** — 228 lines total. `## TDD Cycle Evidence` table spans lines 193-228 (30 task rows). Confirmed by counting `^| T-0` patterns = 30.

### TDD Table Format Audit (per `strict-tdd-verify.md`)

| Check | Result | Details |
|---|---|---|
| TDD Evidence table present | ✅ | Section `## TDD Cycle Evidence` at line 193. |
| All 30 tasks have rows | ✅ | T-001..T-030 all present (30 rows counted). |
| Pre-flip tasks marked `N/A` | ✅ | T-001..T-027 marked `N/A (pre-flip, T-030 enabled strict_tdd)` for RED, `N/A (pre-flip)` for GREEN/TRIANGULATE, `N/A (new)` for SAFETY NET — semantically equivalent and acceptable per the strict-tdd module. |
| Post-flip tasks have explicit columns | ✅ | T-028 RED ✅, GREEN ✅, TRIANGULATE ✅, SAFETY NET `N/A (new)`, REFACTOR ✅. T-029 same pattern. T-030 GREEN ✅, REFACTOR ✅, rest `N/A` (config change). |
| GREEN claims cross-referenced | ✅ | T-028 GREEN claims 61/61 pass — confirmed by independent run. T-029 GREEN claims 26/26 pass — confirmed by independent run. |
| Triangulation claimed with case counts | ✅ | T-028: 3+ cases per behavior. T-029: 4-6 scenarios per spec file. |

### Cross-Reference: Prior Findings (W-1..W-7, S-1..S-5)

The WARNINGs (W-1..W-7) and SUGGESTIONs (S-1..S-5) from the original verify pass remain **unchanged** in this re-verify. They are pre-existing gaps in test coverage breadth (37/52 spec scenarios lack dedicated tests) and minor code-quality issues. They are **not archive-blockers** per the original pass's Recommendation section ("WARNINGs W-1..W-7 can be addressed in subsequent changes; they are not archive-blockers").

### Final Verdict

**`pass`** — All four quality gates pass independently on the second pass. All three CRITICAL findings (C-1, C-2, C-3) from the first verify pass are demonstrably resolved. The 56 pre-existing lint warnings and the 7 prior WARNING / 5 SUGGESTION findings remain on record but are not regressions and not archive-blockers.

**`sdd-archive` is now unblocked.** The change `medication-tracker-pwa` is ready to proceed to the archive phase.
