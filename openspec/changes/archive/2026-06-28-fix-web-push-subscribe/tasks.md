# Tasks: fix-web-push-subscribe

## Stack & Conventions

| Dimension | Value |
|---|---|
| Test runner | Vitest 4.x (`pnpm vitest run`) + Playwright 1.61.x (`pnpm test:e2e`) |
| Strict TDD | **Active** — RED→GREEN for new code |
| Typecheck | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| Build | `pnpm build` |

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~237 (+222/−15) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Work-Unit Commit Plan

All 7 commits on the same single-PR branch.

### Task 1 — `chore(db): add migration 0021`

**Files**: `supabase/migrations/0021_notification_settings_unique_fix.sql` (new, +10)
**TDD**: None (idempotent migration, no test)
**Accept**: Migration file exists, `DROP CONSTRAINT IF EXISTS`, idempotent. Risk: none.

### Task 2 — `feat(notifications): Spanish error mapper`

**Files**: `src/features/notifications/scheduler.ts` (+20), `tests/unit/notifications/scheduler.test.ts` (new, +20)
**RED**: Write 5 Vitest cases — `mapSubscriptionErrorToSpanish` mapping for `NotAllowedError`/`AbortError`/`SecurityError`/unknown/mapped reason logged via `vi.spyOn(console,'warn')`.
**GREEN**: Export `mapSubscriptionErrorToSpanish(reason: string): string`. Map 3 DOMExceptions + fallback per spec. Verify 5 pass.
**Refactor**: None expected. Risk: low (pure function).

### Task 3 — `chore(notifications): log push subscription failures`

**Files**: `src/features/notifications/pushSubscription.ts:121-125` (+2)
**TDD**: None (diagnostic `console.warn` in existing catch path).
**Accept**: `console.warn('[push-subscription] supabase insert failed:', error)` added. Risk: none.

### Task 4 — `fix(notifications): save web_push preference before handshake`

**Files**: `src/features/notifications/NotificationSettingsForm.tsx:38-82` (+20/-10), `tests/unit/notifications/NotificationSettingsForm.test.tsx` (+15)
**RED**: Add 1 test — "mutate called before subscribe when rejecting". Mock `requestPushSubscription → {ok:false, reason:'NotAllowedError'}`. Assert `updateMutation.mutate({channel:'web_push', enabled:true})` called, checkbox stays checked, Spanish banner visible, raw `NotAllowedError` absent, Reintentar present.
**GREEN**: Rewrite `handleToggle` for web_push: `mutate(...)` FIRST, then `setPushSubscriptionState('pending')`, then `subscribe()`. No early return. Use `mapSubscriptionErrorToSpanish` for banner.
**Refactor**: Ensure toggle-OFF path is unchanged (no subscribe). Risk: low (reorder only).

### Task 5 — `feat(notifications): badge + Reintentar banner`

**Files**: `src/features/notifications/NotificationSettingsForm.tsx:132-183` (+50/-5), `tests/unit/notifications/NotificationSettingsForm.test.tsx` (+25)
**RED**: Add 2 tests — (a) "Reintentar re-runs subscribe without re-mutate": click Reintentar → `requestPushSubscription` called 2nd time, `mutate` NOT called again. (b) "badge shows subscribed after success": resolve `{ok:true}`, assert `subscribed` state renders.
**GREEN**: Add `pushSubscriptionState: 'idle'|'pending'|'subscribed'|'failed'` + `PushSubscriptionBadge` local helper after web_push label. States: pending=gray "Pendiente…", subscribed=green "Push activo", failed=yellow "Push no configurado". Replace red box with yellow `#fef9c3` banner + Reintentar (no re-mutate). `aria-live` on badge, `role="alert"` on banner.
**Refactor**: None expected. Risk: low (pure UI).

### Task 6 — `test(notifications): unit coverage for state machine`

**Files**: `tests/unit/notifications/NotificationSettingsForm.test.tsx` (+60)
Add 4-6 edge cases: toggle OFF resets to `idle`, toggle disabled while `pending`, unknown error → fallback Spanish, `console.warn` spy asserts raw reason logged, success → DeviceList renders. Strengthens tasks 4-5. Risk: none.

### Task 7 — `test(e2e): happy + denied-permission push paths`

**Files**: `tests/e2e/push.spec.ts` (+60)
Add 2 Playwright cases: (a) happy — `context.grantPermissions(['notifications'])`, toggle web_push, assert DeviceList renders (gated `hasVapidKey()`). (b) denied — `addInitScript(() => Object.defineProperty(Notification,'permission',{get:()=>'denied'}))`, toggle, assert yellow banner + Spanish text + Reintentar visible. Risk: low.

## Verification

| Check | Command |
|---|---|
| Unit tests | `pnpm vitest run tests/unit/notifications/` |
| E2E | `pnpm test:e2e push.spec.ts` |
| Typecheck | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| Build | `pnpm build` |

## Rollback

Revert commits in reverse (7→1). Each independently revertable. Migration 0021: `DROP CONSTRAINT IF EXISTS` idempotent.

## Definition of Done

- [ ] All 7 tasks committed and pushed
- [ ] `pnpm vitest run tests/unit/notifications/` passes (5 new scheduler + 7-9 form tests)
- [ ] `pnpm test:e2e push.spec.ts` passes both new paths
- [ ] `pnpm tsc --noEmit` clean, `pnpm lint` clean
- [ ] `pnpm build` succeeds
- [ ] Migration 0021 applied (no-op on prod, closes schema drift)
- [ ] Manual smoke: incognito toggle → checkbox stays checked, yellow banner + Reintentar
