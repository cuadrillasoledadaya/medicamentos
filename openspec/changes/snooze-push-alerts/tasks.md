# Tasks: Snooze Push Alerts

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~470 (PR1: 100, PR2: 150, PR3a: 85, PR3b: 135) |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3a → PR 3b |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | SQL view fix: extend `tomas_due_for_push` for snoozed-expired tomas | PR 1 | Base: `main`. Pure SQL migration + pglite integration test. |
| 2 | SW `openWindow` + `/today` route + highlight | PR 2 | Base: `main`. SW handler extraction, router, TodayPage. |
| 3a | Deep-link auto-trigger hook | PR 3a | Base: `main`. `useNotificationDeepLinkAction` + test. |
| 3b | iOS modal + TodayPage wiring | PR 3b | Base: `main`. `IntakeActionModal` + test + TodayPage wiring. |

## Gatekeeper Warnings (RESOLVED)

- **B-1 FIXED**: `sw.ts` now imports and uses `decideNotificationClick` from `swPushHandler.ts` — thin wrapper pattern per design D5.
- **B-2 FIXED**: PR1 test uses pglite (in-process Postgres) with real fixture rows — asserts actual view WHERE semantics, not just regex.
- **W-1 FIXED**: PR2 split into 2 commits (SW extraction + router/TodayPage). PR3b split into 2 commits (modal + wiring).
- **W-2 FIXED**: PR3 split into PR3a (hook, ~85 lines) and PR3b (modal+wiring, ~135 lines). Each under 200 lines.
- **W-3 ACCEPTED**: PR3-T7 e2e test skipped — optional task.

---

## PR 1 — SQL View Fix (snooze-re-trigger)

### Test First (RED)

- [x] **PR1-T1**: Write `tests/unit/migrations/snooze-retrigger-view.test.ts` with 4 scenarios from spec: (a) snoozed-expired within 1-min appears, (b) snoozed beyond 5-min excluded, (c) overlap returns exactly once, (d) taken+snoozed excluded. Use Supabase test client. Run `pnpm vitest run --reporter=verbose tests/unit/migrations/snooze-retrigger-view.test.ts` — expect FAIL (view not yet extended).

### Implementation (GREEN)

- [x] **PR1-T2**: Create `supabase/migrations/0023_snooze_retrigger_view.sql` with guarded OR from design lines 94-118. Apply via Supabase CLI (`supabase db reset` or targeted apply). Re-run PR1-T1 test — expect PASS.

### Verify

- [x] **PR1-T3**: Run `pnpm test:run && pnpm typecheck` — expect all passing.

### Commit + Push + PR

- [x] **PR1-T4**: `git checkout -b fix/snooze-retrigger-view main`. Commit as `feat(db): extend tomas_due_for_push view for snoozed-expired tomas + test`. Push branch. Open PR via GitHub web UI (`gh` not installed) targeting `main`.

---

## PR 2 — SW + Router

### Test First (RED)

- [ ] **PR2-T1**: Extend `tests/unit/notifications/swPushHandler.test.ts` with `describe('decideNotificationClick')` — 5 cases: taken, snooze, skip (assert `openUrl` + `postMessage`), body tap (assert `openUrl` only), orphan (assert both null). Run `pnpm vitest run tests/unit/notifications/swPushHandler.test.ts` — expect FAIL (function not exported).
- [ ] **PR2-T2**: Write `tests/unit/pages/TodayPage.test.tsx` — assert (a) renders TodayList at `/today`, (b) highlight class when `?tomaId=uuid`. Use `MemoryRouter`. Run `pnpm vitest run tests/unit/pages/TodayPage.test.tsx` — expect FAIL (no page, no route).

### Implementation (GREEN)

- [ ] **PR2-T3**: Add `decideNotificationClick(action, tag)` to `src/features/notifications/swPushHandler.ts` per design interface lines 138-158. Re-run PR2-T1 — expect PASS.
- [ ] **PR2-T4**: Replace inline switch at `src/sw.ts:157-181` with `const d = decideNotificationClick(action, tag); if (d.openUrl) event.waitUntil(self.clients.openWindow(d.openUrl));`. Keep `postMessage` loop AFTER openWindow. Run full test suite — expect PASS.
- [ ] **PR2-T5**: Create `src/pages/TodayPage.tsx` scaffold: render `<TodayList>`, parse `?tomaId=`, pass `highlightTomaId`. Add `highlightTomaId?: string` prop to `src/features/tomas/TodayList.tsx` with yellow border + `scrollIntoView`. Add route `{ path: '/today', element: <SuspenseWrapper><TodayPage /></SuspenseWrapper> }` in `src/router.tsx` inside `RequireAuth > AppShell`. Re-run PR2-T2 — expect PASS.

### Verify

- [ ] **PR2-T6**: Run `pnpm test:run && pnpm typecheck && pnpm lint` — expect all passing.

### Commit + Push + PR

- [ ] **PR2-T7**: Branch from `main`. Commit 1: `feat(sw): extract decideNotificationClick for openWindow URL + test`. Commit 2: `feat(router): add /today route + TodayPage + tomaId highlight + tests`. Push branch `fix/sw-router-deeplink`. Open PR to `main` via GitHub web UI.

---

## PR 3 — iOS Modal + Auto-trigger

### Test First (RED)

- [ ] **PR3-T1**: Write `tests/unit/hooks/useNotificationDeepLinkAction.test.ts` — mock `useSearchParams` returning `?action=snooze`, assert mutation fires once then `navigate('/today', { replace: true })` called. Run `pnpm vitest run tests/unit/hooks/useNotificationDeepLinkAction.test.ts` — expect FAIL.
- [ ] **PR3-T2**: Write `tests/unit/notifications/IntakeActionModal.test.tsx` — mock `isIOS=true`, render with `open=true`, assert 3 buttons visible; click each and assert correct mutation. Run `pnpm vitest run tests/unit/notifications/IntakeActionModal.test.tsx` — expect FAIL.

### Implementation (GREEN)

- [ ] **PR3-T3**: Write `src/hooks/useNotificationDeepLinkAction.ts` — reads `?action=`, dispatches matching mutation once, `navigate('/today', { replace: true })`. Re-run PR3-T1 — expect PASS.
- [ ] **PR3-T4**: Create `src/features/notifications/IntakeActionModal.tsx` — 3 buttons wired to existing mutations (`useMarkTomaTaken`, `snooze_toma` RPC, `useMarkTomaSkipped`). Import `isIOS` from `./scheduler`. Backdrop z-999, panel z-1000. Re-run PR3-T2 — expect PASS.
- [ ] **PR3-T5**: Wire into `TodayPage.tsx`: call `useNotificationDeepLinkAction()`, render `<IntakeActionModal>` when `isIOS() && ?tomaId= set && no ?action=`. Run full test suite — expect PASS.

### Verify

- [ ] **PR3-T6**: Run `pnpm test:run && pnpm typecheck && pnpm lint && pnpm build` — expect all passing.
- [ ] **PR3-T7** *(optional)*: Extend `tests/e2e/push.spec.ts` with deep-link snooze flow (skipped in dev). Run `pnpm test:e2e` — expect PASS if headed.

### Commit + Push + PR

- [ ] **PR3-T8**: Branch from `main`. Commit 1: `feat(hook): useNotificationDeepLinkAction for ?action= auto-trigger + test`. Commit 2: `feat(notifications): IntakeActionModal for iOS deep-link fallback + test`. Commit 3 (optional): `test(e2e): add deep-link snooze flow`. Push branch `fix/ios-snooze-modal`. Open PR to `main` via GitHub web UI.
