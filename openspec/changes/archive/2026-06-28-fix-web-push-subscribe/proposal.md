# Proposal: fix-web-push-subscribe

## Intent

Users who toggle **web_push** ON in production see the checkbox immediately revert to OFF, with zero rows written to `notification_settings` for that channel. The root cause is a hard gate in `NotificationSettingsForm.tsx:63-75`: `requestPushSubscription()` runs first, and if `pushManager.subscribe` rejects (e.g. `NotAllowedError` in Chrome incognito), the function returns before `updateMutation.mutate()` ever fires. The user sees a small red box at the top of the form with a raw English exception name (`NotAllowedError`) — easy to miss, untranslated.

Live DB confirms: 0 `web_push` rows exist, only 1 `in_app` row. The cron (`notify-push-due-tomas`) runs every minute but has no subscribers to deliver to.

## Scope

### In Scope
- Decouple the `notification_settings` row-save from the push handshake: save the preference first, then attempt subscribe
- Add a visible subscription-state badge next to the web_push label (`pending` / `subscribed` / `failed`)
- Replace the raw error banner with a prominent, translated Spanish message + "Reintentar" button
- Map known `DOMException` names to friendly Spanish reasons in `scheduler.ts`
- Add `console.warn` in failure paths for future debugging
- Include migration `0021_notification_settings_unique_fix.sql` as a first commit (schema drift fix — already live, missing from repo)
- Unit tests: `NotificationSettingsForm` (toggle + failure banner), `scheduler` (error mapping)
- E2E tests: happy path with granted permissions, failure path with denied permissions

### Out of Scope
- VAPID key validation or rotation — deployment config task, separate change
- Fixing the cron reading `push_subscriptions` vs `notification_settings` — already correct (cron reads `push_subscriptions` via `get_active_push_subscribers` RPC)
- iOS standalone detection improvements — already handled
- Email/SMS channel fixes — unrelated

## Capabilities

### New Capabilities
- `push-subscription-ux`: Decoupled preference-save from push handshake, visible subscription state, translated error banners with retry

### Modified Capabilities
None

## Approach

**Core fix**: In `handleToggle('web_push', false)`, call `updateMutation.mutate(...)` FIRST to persist the user's intent, THEN call `requestPushSubscription()`. If subscribe fails, the row stays `enabled=true` and the UI shows a yellow warning banner with a "Reintentar" button that calls `requestPushSubscription()` again. The checkbox remains checked.

**Why this is safe**: The cron reads `push_subscriptions` (not `notification_settings`) for actual delivery. A `notification_settings` row with `web_push, enabled=true` but no matching `push_subscriptions` row simply means "user wants push, but no device is registered yet." The cron logs `no active subscribers` and moves on — no harm.

**Migration 0021**: Include as the first commit. The constraint `UNIQUE NULLS NOT DISTINCT` is already live in production (verified). The migration file is missing from the repo, creating schema drift. Applying it is a no-op on live DB but closes the gap for any future `supabase db push` or migration replay. 5 lines, zero risk.

**PR shape**: Single PR. Estimated ~200 changed lines across 4 source files + 2 test files + 1 migration — well within the 400-line review budget. No chaining needed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/notifications/NotificationSettingsForm.tsx:63-82` | Modified | Reorder: mutate before subscribe, add `pushSubscriptionState` state, retry button, Spanish error mapping |
| `src/features/notifications/scheduler.ts:175-182` | Modified | Map DOMException names to Spanish reasons, add `console.warn` with userAgent slice |
| `src/features/notifications/pushSubscription.ts:121-125` | Modified | Add `console.warn` in the catch path |
| `supabase/migrations/0021_notification_settings_unique_fix.sql` | New | `UNIQUE NULLS NOT DISTINCT` constraint (schema drift fix) |
| `tests/unit/notifications/NotificationSettingsForm.test.tsx` | Modified | Test: toggle web_push when subscribe rejects → checkbox stays checked, banner renders, mutate called |
| `tests/unit/notifications/scheduler.test.ts` | New | Test: error mapping for each known DOMException name |
| `tests/e2e/push.spec.ts` | Modified | Add deterministic tests: happy path (`grantPermissions`), failure path (`addInitScript` denying permission) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Behavioral change: checkbox stays checked even when subscribe fails | Medium | This is the desired behavior — user intent is preserved. The yellow banner + badge make the failure visible. |
| `NotAllowedError` in incognito is a browser hard limit — no code can override it | N/A | The fix makes this visible and retryable. User must use a normal tab or grant permission. |
| VAPID key mismatch on production (keys may have drifted) | Medium | Separate deployment task. This change makes the failure visible so the user (and logs) surface it. |
| Migration 0021 fails on a non-production DB that already has a different constraint | Low | `DROP CONSTRAINT IF EXISTS` before `ADD CONSTRAINT` handles this. |

## Rollback Plan

Revert the single PR commit-by-commit:
1. Revert the migration commit (safe — `DROP CONSTRAINT IF EXISTS` is idempotent; the constraint can be re-added manually if needed)
2. Revert the source code changes — restores the original hard-gate behavior
3. Revert the test additions

No schema data changes are made by the source code; only the migration touches the database.

## Dependencies

- None

## Test Plan

### Unit tests (RED → GREEN)
1. **`NotificationSettingsForm.test.tsx`** — click web_push toggle when `requestPushSubscription` returns `{ok:false, reason:'NotAllowedError'}`:
   - Assert `updateMutation.mutate` was called with `{channel:'web_push', enabled:true}`
   - Assert checkbox remains checked
   - Assert Spanish banner renders (not raw `NotAllowedError`)
   - Assert "Reintentar" button is present

2. **`scheduler.test.ts`** (new) — error mapping for known DOMException names:
   - `NotAllowedError` → `"Tu navegador bloqueó la suscripción. Usá una ventana normal o verificá los permisos."`
   - `AbortError` → `"La suscripción se canceló. Intentá de nuevo."`
   - `SecurityError` → `"La suscripción push no está disponible en este contexto (HTTP sin SSL o iframe)."`
   - Generic unknown error → `"No se pudo activar las notificaciones push. Intentá de nuevo."`

### E2E tests
3. **`push.spec.ts`** — happy path: `context.grantPermissions(['notifications'])`, toggle web_push, assert DeviceList renders
4. **`push.spec.ts`** — failure path: `addInitScript` setting `Notification.permission = 'denied'`, toggle web_push, assert yellow banner with Spanish text appears

### Manual smoke test (for the user)
5. Open app in Chrome incognito → go to Notifications → toggle web_push ON
6. Verify: checkbox stays checked, yellow banner appears with Spanish message, "Reintentar" button visible
7. Open app in normal Chrome tab → toggle web_push ON → accept browser prompt → verify DeviceList shows the device

## Acceptance Criteria

- [ ] User toggles web_push ON in incognito → checkbox stays checked, yellow banner appears with Spanish text, row appears in `notification_settings` as `web_push, enabled=true`
- [ ] Banner shows a "Reintentar" button that re-attempts subscription
- [ ] Badge next to web_push label shows subscription state (`subscribed` = green dot, `failed` = yellow dot, `pending` = spinner)
- [ ] Raw `DOMException` names are never shown to the user — all mapped to Spanish
- [ ] `console.warn` appears in browser devtools for each failure path (for debugging)
- [ ] Migration 0021 exists in `supabase/migrations/` and is idempotent
- [ ] All unit tests pass (`pnpm vitest run tests/unit/notifications/`)
- [ ] E2E push tests pass (`pnpm test:e2e push.spec.ts`)

## Migration Decision

**Include 0021 in this change as the first commit.** Justification:
- The constraint is already live in production — applying the migration is a no-op
- The file is missing from the repo, creating schema drift for any developer who runs `supabase db push` or replays migrations
- It's 5 lines, zero risk, and closes a real gap
- Splitting it into a separate change adds overhead for no benefit — it's trivially small and unrelated to any other pending work

## Non-goals

- Does NOT fix VAPID key drift on production — that's a deployment configuration task
- Does NOT change how the cron delivers notifications — it already reads `push_subscriptions` correctly
- Does NOT add email or SMS channel fixes
- Does NOT improve iOS standalone detection — already handled by existing `isIOS()` / `isIOSStandalone()` logic
