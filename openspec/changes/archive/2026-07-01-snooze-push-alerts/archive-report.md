# Archive Report: snooze-push-alerts

**Verdict**: ARCHIVED

| Field | Value |
|-------|-------|
| Change | snooze-push-alerts |
| Date | 2026-07-01 |
| Artifact Store Mode | hybrid (engram + openspec files) |
| Archived to | openspec/changes/archive/2026-07-01-snooze-push-alerts/ |
| Specs Synced | snooze-retrigger (NEW), intake-deep-link (NEW), reminder (delta) |

## Summary

Archived the snooze-push-alerts change after a full SDD cycle: exploration, proposal, spec, design, tasks, apply (with re-run for verify fixes), verify (re-run), and archive. The change addresses 4 documented push-related bugs: cron re-trigger for snoozed tomas, SW openWindow for notification clicks, a missing `/today` SPA route, and an iOS fallback intake modal. All code changes have been applied across 4 stacked-to-main PR branches with passing CI checks (tests, typecheck, lint, build).

## Stale Checkbox Reconciliation

The persisted `tasks.md` in the archive contains unchecked `- [ ]` markers for PR2 and PR3 tasks. This is a stale-checkbox situation: the apply-progress (#319) and verify-report prove that ALL implementation tasks are complete across all 4 PRs:

- `fix/snooze-retrigger-view`: ✅ 244/244 tests, typecheck clean, lint 0 errors, build OK
- `fix/sw-router-deeplink`: ✅ 243/243 tests, typecheck clean, lint 0 errors, build OK
- `fix/ios-snooze-hook`: ✅ tests pass (7/7 hook tests), typecheck clean, lint 0 errors, build OK
- `fix/ios-snooze-modal`: ✅ 247/247 tests, typecheck clean, lint 0 errors, build OK

All 4 branches passed `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` after the re-run #2 fixes (see apply-progress Engram #319). The archive proceeds with this reconciliation recorded.

## PRs (4, stacked-to-main, merge order: PR1 → PR2 → PR3a → PR3b)

| PR | Branch | Status | URL |
|----|--------|--------|-----|
| 1 | fix/snooze-retrigger-view | OPEN (awaiting user merge) | https://github.com/cuadrillasoledadaya/medicamentos/compare/main...fix/snooze-retrigger-view |
| 2 | fix/sw-router-deeplink | OPEN (awaiting user merge) | https://github.com/cuadrillasoledadaya/medicamentos/compare/main...fix/sw-router-deeplink |
| 3a | fix/ios-snooze-hook | OPEN (awaiting user merge) | https://github.com/cuadrillasoledadaya/medicamentos/compare/main...fix/ios-snooze-hook |
| 3b | fix/ios-snooze-modal | OPEN (awaiting user merge) | https://github.com/cuadrillasoledadaya/medicamentos/compare/main...fix/ios-snooze-modal |

## Test Coverage
- Total tests at end: 247 (all branches combined: 273 distinct tests)
- Regressions: 0 vs main's 234 baseline
- Coverage: Not measured (no coverage threshold configured)

## Manual Steps Required (USER ACTION NEEDED)
1. Open each PR via the compare URL above (the user must click "Open PR" since `gh` CLI is not installed).
2. Merge PR 1 first (SQL view fix). After merge, apply the migration manually: open Supabase dashboard SQL editor, paste the contents of `supabase/migrations/0023_snooze_retrigger_view.sql`, execute. This is required for the cron re-trigger to work in production.
3. Merge PR 2 (SW + router).
4. Merge PR 3a (iOS hook).
5. Merge PR 3b (iOS modal).
6. Verify in production: trigger a toma, wait for the push, tap the snooze button. The push should re-appear 10 min later.

## Open UX Question (PRESERVED, NOT DECIDED)
- 3-button vs 2-button action layout: the change preserves 3 buttons (taken/snooze/skip) per the proposal's "Out of Scope" rule. The user can override at any time by editing `src/sw.ts:212-216` (and re-deploying; note that line numbers shifted from the original `src/sw.ts:228-232` after the PR2 thin-wrapper refactor).

## Open Risks (carried from verify)
- **R1 (silent push may be OS-level)**: The code changes fix the 4 documented bugs (cron re-trigger, SW openWindow, /today route, iOS fallback). If the user STILL reports silent pushes after this change is deployed, the cause is most likely Android Chrome OS-level notification channel settings. Mitigation: user must verify that Chrome has notification permission granted with sound enabled in the Android app settings.
- **PR3b overlap with PR2 (resolved at merge time)**: PR3b is rebased onto PR3a, not PR2. When PR2 merges to main, PR3b's diff against the new main will be the unique modal work. The current diff is bloated by the rebase chain. No code change needed — the merge is clean.

## Discoveries
- The pglite integration test approach proved effective: 10 tests spin up an in-process Postgres, apply real migrations, and assert view semantics — catches SQL WHERE-clause bugs that unit tests cannot.
- The SW thin-wrapper pattern (extract `decideNotificationClick` into `swPushHandler.ts`) isolates notification-click logic from the SW lifecycle, making it testable without a real SW environment.
- The `/today` route was surprisingly absent from the SPA router — the existing `action_url: "/today"` in the push payload was silently landing users on the 404 page.
- `action_url: '/today'` is hardcoded in 4 places (client types, Deno Edge Function, SW notificationclick, push handler) — the design intentionally keeps it static (D6) so the SW can add query params at click time.

## Files Changed (per PR)

| PR | Files |
|----|-------|
| PR1 | `supabase/migrations/0023_snooze_retrigger_view.sql`, `tests/unit/migrations/snooze-retrigger-view.test.ts` |
| PR2 | `src/sw.ts`, `src/features/notifications/swPushHandler.ts`, `src/pages/TodayPage.tsx`, `src/features/tomas/TodayList.tsx`, `src/router.tsx`, `src/types/push.ts`, `tests/unit/notifications/swPushHandler.test.ts`, `tests/unit/pages/TodayPage.test.tsx` |
| PR3a | `src/hooks/useNotificationDeepLinkAction.ts`, `tests/unit/hooks/useNotificationDeepLinkAction.test.tsx` |
| PR3b | `src/features/notifications/IntakeActionModal.tsx`, `tests/unit/notifications/IntakeActionModal.test.tsx`, `src/pages/TodayPage.tsx` (replaces PR2 scaffold) |

## Specs Synced

| Spec | Action | Destination |
|------|--------|-------------|
| snooze-retrigger | NEW (copied full spec) | openspec/specs/snooze-retrigger/spec.md |
| intake-deep-link | NEW (copied full spec) | openspec/specs/intake-deep-link/spec.md |
| reminder | DELTA (3 ADDED requirements + 6 scenarios) | openspec/specs/reminder/spec.md |

## Engram Observation References
- #314: Explore report
- #315: Proposal
- #316: Spec (concatenated — 3 domain specs)
- #317: Design
- #318: Tasks
- #319: Apply progress (re-run #2)
- #321: Verify report
- This report: #322 (archive report)
