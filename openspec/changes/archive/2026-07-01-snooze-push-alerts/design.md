# Design: snooze-push-alerts (SQL UNION, /today route, IntakeActionModal)

## Key Decisions (D1–D7)
- **D1**: SQL form = guarded OR on existing view (mutually exclusive by `snoozed_until IS NULL` / `IS NOT NULL`). Rejected plain OR (doubles) and new view (extra cron).
- **D2**: URL pattern = `/today?tomaId=<uuid>&action=<taken|snooze|skip>`. Rejected `/intake/:tomaId` (collides with broken email/SMS path).
- **D3**: Auto-trigger = dedicated `useNotificationDeepLinkAction` hook in `TodayPage`. Reused existing mutations, navigate-and-replace gives fire-once.
- **D4**: `/today` route = real route → new `TodayPage` lazy component wrapping `<TodayList pacienteId=… />`. Not redirect, not DayDrawer.
- **D5**: SW click logic = extract `decideNotificationClick` into `swPushHandler.ts` for testability. `sw.ts:150-186` becomes thin wrapper.
- **D6**: `action_url` stays static `'/today'` in payload. SW assembles query params at click time. Preserves 500-byte contract.
- **D7**: Modal = `src/features/notifications/IntakeActionModal.tsx` with props `{ tomaId, open, onClose }`. Follows `DayDrawer.tsx` visual pattern.

## Chain Strategy
Stacked-to-main — 4 PRs against `main` independently. Merge order: PR1 → PR2 → PR3a → PR3b.

## PRs
| PR | Branch | Description |
|----|--------|-------------|
| 1 | fix/snooze-retrigger-view | SQL migration: guarded OR in tomas_due_for_push + pglite integration test |
| 2 | fix/sw-router-deeplink | SW openWindow + /today route + highlight |
| 3a | fix/ios-snooze-hook | Deep-link auto-trigger hook |
| 3b | fix/ios-snooze-modal | iOS modal + TodayPage wiring |

## Files Changed (per PR)
- PR1: `supabase/migrations/0023_snooze_retrigger_view.sql`, `tests/unit/migrations/snooze-retrigger-view.test.ts`
- PR2: `src/sw.ts`, `src/features/notifications/swPushHandler.ts`, `src/pages/TodayPage.tsx`, `src/features/tomas/TodayList.tsx`, `src/router.tsx`, `src/types/push.ts`, `tests/unit/notifications/swPushHandler.test.ts`, `tests/unit/pages/TodayPage.test.tsx`
- PR3a: `src/hooks/useNotificationDeepLinkAction.ts`, `tests/unit/hooks/useNotificationDeepLinkAction.test.tsx`
- PR3b: `src/features/notifications/IntakeActionModal.tsx`, `tests/unit/notifications/IntakeActionModal.test.tsx`, `src/pages/TodayPage.tsx` (replaces PR2 scaffold)
