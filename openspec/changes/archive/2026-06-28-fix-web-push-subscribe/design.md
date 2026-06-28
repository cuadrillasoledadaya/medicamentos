# Design: fix-web-push-subscribe

## Overview

Decouple the `web_push` preference-save from the push handshake: reorder `updateMutation.mutate(...)` to run BEFORE `requestPushSubscription()`, add a 4-state badge (`idle` / `pending` / `subscribed` / `failed`), replace the raw-English error banner with a translated Spanish message + "Reintentar", and ship migration `0021` (5 lines, idempotent) as a schema-drift fix. ~200 changed lines across 4 source files + 2 test files + 1 migration. Single PR, no chaining. Cron reads `push_subscriptions` (not `notification_settings`), so a saved preference without a subscription row is harmless.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| `pushSubscriptionState` location | Local `useState` in form | Pure UI state; React Query holds the persisted preference. |
| Error mapping | New `mapSubscriptionErrorToSpanish()` in `scheduler.ts` | Co-located with `requestPushSubscription`. |
| Reintentar scope | Always shown for every failure (incl. `ios-not-standalone`) | Spec mandates for 4 mapped reasons; iOS keeps it as a post-install path. |
| Badge visual | Text + colored dot, no spinner | Matches existing reliability-indicator pattern; accessible without animation. |
| iOS-not-standalone branch | Keep dedicated branch, bypass mapper | PWA-install guidance the 4 mapped messages don't carry. |
| `console.warn` placement | `scheduler.ts` (unknown reason) + `pushSubscription.ts` (Supabase insert failure) | Spec REQ-2 + symmetric for insert-failure path. |
| Migration 0021 order | First commit | Schema-drift fix is independent; reverts cleanly. |

## State Machine

`pushSubscriptionState: 'idle' | 'pending' | 'subscribed' | 'failed'`

| From → To | Trigger | Side effects | Race guard |
|---|---|---|---|
| `idle → pending` | Toggle web_push ON | `mutate({web_push, true})` → `setState('pending')` → `requestPushSubscription()` | Disable toggle while `isPending` OR `state==='pending'` |
| `pending → subscribed` | Subscribe `{ok:true}` | `setState('subscribed')`, clear `pushError` | — |
| `pending → failed` | Subscribe `{ok:false, reason}` | `setState('failed')`, set mapped message, `console.warn(reason, {userAgent})` | — |
| `failed → pending` | Click Reintentar | `requestPushSubscription()` only (no re-mutate) | Disable button while `pending` |
| `subscribed → idle` | Toggle web_push OFF | `mutate({web_push, false})` only; no handshake, no unsubscribe | — |
| `failed → idle` | Toggle web_push OFF | Same as above | — |

`idle` renders no badge. Spec REQ-3 also confirms: subscription persists across toggle-OFF until explicit "Revoke" on DeviceList.

## Error Mapping

`mapSubscriptionErrorToSpanish(reason: string): string` in `scheduler.ts`.

| `reason` | Spanish message (verbatim from spec) | Branch |
|---|---|---|
| `NotAllowedError` | Tu navegador bloqueó la suscripción. Usá una ventana normal o verificá los permisos. | mapper |
| `AbortError` | La suscripción se canceló. Intentá de nuevo. | mapper |
| `SecurityError` | La suscripción push no está disponible en este contexto (HTTP sin SSL o iframe). | mapper |
| any other | No se pudo activar las notificaciones push. Intentá de nuevo. | mapper (fallback) |
| `ios-not-standalone` | En iPhone, las notificaciones push solo funcionan si la app está instalada en tu pantalla de inicio. | dedicated (form) |

All 5 messages render the Reintentar button. `ios-not-standalone` is an internal sentinel at `scheduler.ts:159-161`, not a `DOMException` name — it keeps the existing dedicated branch at `NotificationSettingsForm.tsx:68-70`.

## File-by-File Change Plan

| File | Change |
|---|---|
| `supabase/migrations/0021_notification_settings_unique_fix.sql` (new) | `DROP CONSTRAINT IF EXISTS notification_settings_unique; ADD CONSTRAINT notification_settings_unique UNIQUE NULLS NOT DISTINCT (paciente_id, medication_id, channel);` + header. Idempotent. |
| `src/features/notifications/scheduler.ts:155-183` | Add `mapSubscriptionErrorToSpanish`. In `catch` at `:179-182`, `console.warn('[push-subscription] handshake failed:', err, { userAgent: navigator.userAgent })` before return. |
| `src/features/notifications/pushSubscription.ts:121-125` | `console.warn('[push-subscription] Supabase insert failed:', error)` in `if (error)` before `subscription.unsubscribe()`. |
| `src/features/notifications/NotificationSettingsForm.tsx:38-82` | Add `const [pushSubscriptionState, setPushSubscriptionState] = useState<PushSubscriptionState>('idle')`. Rewrite `handleToggle` for `web_push`: `mutate({...})` FIRST, then `setState('pending')`, then `requestPushSubscription()`, then transition state. No early-return on handshake failure. `ios-not-standalone` keeps dedicated message + `state='failed'`. |
| `src/features/notifications/NotificationSettingsForm.tsx:132-148` | Replace red box with yellow `#fef9c3` banner (`role="alert"`, `aria-live="assertive"`), Spanish text, Reintentar button (no re-mutate). Button `disabled` while `state==='pending'`. |
| `src/features/notifications/NotificationSettingsForm.tsx:166-183` | Add `<PushSubscriptionBadge state={...} />` after web_push label. Local helper: `pending`=gray dot+"Pendiente…", `subscribed`=green+"Push activo", `failed`=yellow+"Push no configurado". `aria-live="polite"`. |
| `tests/unit/notifications/scheduler.test.ts` (new) | 4 mapper cases (each `DOMException` + fallback) + 1 case for unknown-reason `console.warn` (`vi.spyOn(console,'warn')`). |
| `tests/unit/notifications/NotificationSettingsForm.test.tsx` | 3 new cases: (a) rejection → `mutate` called first, checkbox stays checked, Spanish banner, raw `NotAllowedError` NOT visible, Reintentar present; (b) Reintentar click → `requestPushSubscription` 2nd time, `mutate` NOT again; (c) success → badge `subscribed`, DeviceList empty-state visible. `vi.mocked(requestPushSubscription).mockResolvedValueOnce(...)` for per-call. |
| `tests/e2e/push.spec.ts:200-260` | 2 cases: happy with `context.grantPermissions(['notifications'])` (gated on `hasVapidKey()`); failure with `context.addInitScript(() => Object.defineProperty(Notification, 'permission', { get: () => 'denied' }))` — assert yellow banner text + Reintentar visible. |

## Data Flow

```
click web_push ON
  → mutate({web_push, true})           (Supabase row created regardless)
  → setState('pending')
  → requestPushSubscription()
      ├── ok:true   → setState('subscribed') → green dot
      └── ok:false  → setState('failed') + mapped Spanish + console.warn
                       → yellow banner + [Reintentar]
                            └── click → setState('pending') → requestPushSubscription() ...
```

## Commit Plan

| # | Subject | +/− | Tests | Risk |
|---|---|---|---|---|
| 1 | `chore(db): add migration 0021` | +10 | none (idempotent) | none |
| 2 | `feat(notifications): Spanish error mapper` | +20 | 5 new vitest (RED→GREEN) | none — pure fn |
| 3 | `chore(notifications): log push subscription failures` | +2 | none (diagnostic) | none |
| 4 | `fix(notifications): save web_push preference before handshake` | +20/−10 | 1 new vitest | low — reorder only |
| 5 | `feat(notifications): subscription state badge + Reintentar banner` | +50/−5 | 2 new vitest | low — pure UI |
| 6 | `test(notifications): unit coverage for state machine` | +60 | strengthens 4-5 | none |
| 7 | `test(e2e): happy + denied-permission push paths` | +60 | 2 new Playwright | low |

Total **+222/−15**, 7 commits. Single PR; each commit is green and independently revertable.

## Test Plan

| Layer | File | What | Mock |
|---|---|---|---|
| Unit | `scheduler.test.ts` (new) | 4 mapper + 1 warn | `vi.spyOn(console, 'warn')` |
| Unit | `NotificationSettingsForm.test.tsx` | 3 new (rejection, Reintentar, success) | existing `vi.mock` + `mockResolvedValueOnce` |
| E2E | `push.spec.ts` | happy (`grantPermissions`) + denied (`addInitScript`) | Playwright primitives |
| Manual | Chrome incognito + normal | per proposal §Manual smoke | none |

## Risks

| Risk | Mitigation |
|---|---|
| VAPID key drift on production | Out of scope (deployment-config). New design makes failure visible (yellow banner + `console.warn`). |
| Checkbox stays checked on failure | Desired per spec REQ-1. Yellow banner is the visibility mechanism. |
| Double-click Reintentar | `pending` state disables both Reintentar and the toggle. |
| iOS Reintentar re-rejects | Re-rejection is the clear signal that PWA must be installed. |
| Migration on a fresh DB | `DROP CONSTRAINT IF EXISTS` no-op; `ADD CONSTRAINT` succeeds. Additive only. |

## Rollout

Single PR; no feature flag. Migration 0021 is a no-op on production. Rollback = revert commits in reverse; migration reverts via `DROP CONSTRAINT`. No data migration.

**Spec archive sync**: the MODIFIED scenario in `specs/push-subscription-ux/spec.md` (Requirement: "Web push channel requires browser permission [modified]") replaces the old scenario in `openspec/specs/reminder/spec.md:34-40`. The `sdd-archive` phase MUST update `reminder/spec.md` to drop the contradictory "toggle reverts to OFF" line and adopt the new "toggle stays checked + Spanish banner + Reintentar" behavior. The spec carries the explicit "Archive sync" note; the design references it here so it isn't missed at archive time.

## Open Questions

- **iOS Reintentar semantics** — spec is silent; design follows proposal (keep button). Harmless when re-rejected.
- **Banner placement** — kept above toggles (where red box sat). 1-line move if reviewers prefer below.
