# Proposal: web-push-notifications

## Why

Caregivers today only receive medication reminders when the PWA is open in their browser. If they close the tab or put their phone away, they miss the notification entirely. This change introduces real Web Push notifications that fire even when the PWA is closed, so caregivers never miss a medication time — the same reliability they expect from native apps.

## What changes

- Caregivers can **opt in** to push notifications per paciente (one-time browser permission prompt)
- When a medication dose is due, a **system-level notification appears on their device** — even if the PWA is closed, the browser is not running, or the phone is locked
- The notification includes **action buttons**: "Marcar como tomada", "Posponer 10 min", "Saltar" — tapping any button opens the PWA and records the action
- Each active family caregiver for a paciente receives their own push (not just the primary caregiver)
- A **new "Push Notifications" section** in Notification Settings shows subscription status, connected devices, and a "Revoke this device" button
- Dead or expired push subscriptions are automatically cleaned up (no wasted notifications)

## Out of scope

- **Quiet hours** — no "do not disturb" scheduling (v2)
- **Cross-device snooze** — snoozing on one device does not cancel the push on another (v2)
- **iOS "Add to Home Screen" install prompt** — iOS PWA push works only when added to home screen; we document this constraint but defer the explicit install UX (v2)
- **Email/SMS fallback improvements** — the existing notify-fallback stubs remain unchanged in this change
- **Notification deduplication beyond same-device** — if both client-side and server push fire for the same dose, the user may see two notifications (acceptable for v1)

## User-facing flows

### (a) First-time opt-in
1. Caregiver opens Notification Settings for a paciente
2. A "Enable push notifications" toggle is shown (off by default)
3. On toggle, the browser shows its native permission prompt ("This app wants to send notifications")
4. If accepted: a green "Push active on this device" badge appears. If denied: a red badge with a "Why can't I enable this?" link explaining browser/iOS constraints

### (b) Receiving a push
1. At the medication's `scheduled_at` time (±60 seconds), the caregiver's phone vibrates and shows a system notification
2. The notification displays: medication name, dose, and scheduled time
3. Three action buttons are visible: Taken / Snooze 10 min / Skip

### (c) Acting on the push
1. **Taken** → opens the PWA, marks the dose as taken, shows confirmation
2. **Snooze** → dismisses the notification; a new push fires 10 minutes later
3. **Skip** → opens the PWA, marks the dose as skipped, shows confirmation
4. If the caregiver taps the notification body (not a button) → opens the PWA to the today's schedule view

### (d) Managing devices in settings
1. Notification Settings lists each device that has an active push subscription (e.g., "Chrome on Android — last active 2 hours ago")
2. A "Revoke" button next to each device removes that subscription
3. Revoking does not affect other devices

## Technical approach (one paragraph)

A Supabase Edge Function (extending the existing `notify-fallback`) sends Web Push messages using the `web-push` library and VAPID keys. A new `pg_cron` job runs every 60 seconds, queries `tomas` that are due within the next minute, and calls the Edge Function for each. The Edge Function looks up active push subscriptions for all active family members of the paciente and sends a push to each. The frontend adds a subscription flow (using `VITE_VAPID_PUBLIC_KEY`) and the existing Service Worker `push` event handler is upgraded to validate payload, display the notification with action buttons, and post action results back to the server. Dead subscriptions (HTTP 410) are automatically marked inactive.

## Migration plan (high level)

1. **SQL**: Create `push_subscriptions` table, add `'web_push'` to the notification channel enum, create a new `pg_cron` job for due-toma polling, and update the `notify-fallback` trigger to include the new channel
2. **Edge Function**: Extend `supabase/functions/notify-fallback/index.ts` to accept push payloads, load VAPID keys from secrets, and send via the `web-push` library
3. **Frontend**: Add push subscription UI in NotificationSettingsForm, wire `pushManager.subscribe()` on opt-in, and upgrade the SW `push` event handler with payload validation and action routing
4. **Configuration**: Generate VAPID key pair (developer local), store private key as Supabase secret, set `VITE_VAPID_PUBLIC_KEY` in the frontend build
5. **Docs**: Update README with push setup instructions and iOS constraints

## Assumptions and open questions

- [assumption] **Recipients**: All `family_members` with `status='active'` for a paciente receive the push, not just the `cuidador_principal`
- [assumption] **Polling interval**: The cron job runs every 1 minute (medication timing is too critical for 5-minute lag)
- [assumption] **Quiet hours**: Deferred to v2 — no time-based suppression in this change
- [assumption] **Cross-device snooze**: Deferred to v2 — snooze is per-device only
- [assumption] **Notification channel**: A new `'web_push'` enum value is added (distinct from `in_app`)
- [assumption] **VAPID public key**: Delivered via build-time env var `VITE_VAPID_PUBLIC_KEY`; no runtime config endpoint in v1
- [assumption] **VAPID key generation**: Developer generates keys locally and stores them as Supabase Edge Function secrets
- [assumption] **iOS**: PWA must be "Add to Home Screen" for push to work; we reuse the existing `isIOS()` helper to show a constraint badge but defer the explicit install prompt UX
- [assumption] **Deduplication**: Both client-side scheduling and server push may fire for the same dose in v1; the Service Worker uses a `notification_id` field to dedupe on the same device
- [assumption] **Subscription pruning**: The Edge Function marks subscriptions as inactive when the push service returns HTTP 410 Gone
- [assumption] **Per-paciente delivery**: One push per `toma` per caregiver; each caregiver gets their own push via their own subscription(s)
- [assumption] **No quiet hours or frequency capping** in v1 — every due toma generates a push to every active subscriber
- [open] **What happens if the Edge Function times out** while sending pushes to many caregivers? (Supabase Edge Functions have a 60s limit — acceptable for typical family sizes of 2-5)
- [open] **Should we track push delivery success/failure** in a `notification_log` table for audit purposes? (Recommended for v2)

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| iOS PWA push requires "Add to Home Screen" — users may not know | High | Show constraint badge with `isIOS()` helper; document in onboarding |
| Push service rate limits (FCM/APNs) if many tomas fire simultaneously | Low | Medication schedules are spread across the day; batch sends per caregiver |
| Dead subscriptions accumulate and waste Edge Function time | Medium | 410 pruning on every send; periodic cleanup cron in v2 |
| Clock skew between server cron and `scheduled_at` causes late pushes | Low | 1-minute polling + 60-second tolerance window covers typical drift |
| Duplicate notifications (client + server both fire) | Medium | Acceptable for v1; `notification_id` dedupe on same device; cross-device defer to v2 |
| VAPID key leak exposes push sending capability | Low | Keys stored as Supabase secrets, never in client code; rotation is a one-command process |

## Rollback plan

1. **Disable the cron job**: `SELECT cron.unschedule('notify-push-due-tomas');` — stops all new push triggers immediately
2. **Remove the trigger modification**: Revert the `notify-fallback` trigger to its previous behavior (email/SMS only)
3. **Frontend toggle**: The push opt-in toggle can be hidden via a feature flag or config — existing subscriptions remain in the database but receive no pushes
4. **No data loss**: The `push_subscriptions` table can remain; removing it is optional and done in a separate migration
5. **Full revert**: Drop `push_subscriptions` table, remove `'web_push'` from enum, remove VAPID secrets — all reversible with standard SQL

## Success criteria

- [ ] A caregiver receives a push notification within 60 seconds of `scheduled_at` with the PWA fully closed (browser not running)
- [ ] Action buttons (Taken / Snooze / Skip) work correctly and update the `tomas` status in the database
- [ ] Dead subscriptions are automatically marked inactive after a 410 response
- [ ] The Notification Settings UI clearly explains what the user is signing up for, shows device status, and allows revoking individual devices
- [ ] iOS users see a clear constraint indicator (yellow badge) explaining that push requires "Add to Home Screen"

## Linked artifacts

- Explore report: Engram topic_key `sdd/web-push-notifications/explore`
- Explore state: Engram topic_key `web-push-notifications/explore-state`
- Existing Edge Function: `supabase/functions/notify-fallback/index.ts`
- Existing Service Worker: `src/sw.ts` (lines 186-203, push event stub)
- Existing notification scheduler: `src/features/notifications/scheduler.ts`
- Reminder spec: `openspec/specs/reminder/spec.md` (Notification Channels requirement — will be modified)
- Schema spec: `openspec/specs/schema/spec.md` (Notification Channel Values — will be modified)
