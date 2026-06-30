<!-- Delta spec. Synced to openspec/specs/reminder/spec.md on 2026-07-01. -->
# Delta: reminder (MODIFIED capability)

## ADDED Requirements (3)

### R1 (new): The SW snooze action SHALL open a window BEFORE postMessage

The SW `notificationclick` handler SHALL call `clients.openWindow(...)` for `snooze` BEFORE invoking `client.postMessage(...)`. Opened URL SHALL be `/today?tomaId=<uuid>&action=snooze`. Ensures the SNOOZE message reaches a live client even when the app was fully closed at tap time. (Previously, snooze postMessage was sent without opening a window and was silently dropped when no client was open — bug at `src/sw.ts:172-175`.)

#### Scenarios
- App NOT open + push with "Posponer 10 min" action displayed + user taps it → SW opens `/today?tomaId=<uuid>&action=snooze` first, THEN posts SNOOZE to the now-open client; `snooze_toma` RPC invoked; toma persisted with `snoozed_until = now() + 10 minutes`.
- App already open + push "Posponer 10 min" + tap → SW focuses existing window or opens new one at `/today?tomaId=<uuid>&action=snooze`; SNOOZE message reaches open client; RPC invoked.

### R2 (new): The 4 alert-behavior flags SHALL be read from the push payload with a default of TRUE

SW SHALL read `vibrate`, `requireInteraction`, `renotify`, `badge` from payload. WHEN a flag is absent (e.g., older EF deployment), SW SHALL default the flag to TRUE so the notification remains sticky and alertante out of the box. (Per-paciente persistence and runtime application are defined in `push-alert-behaviors`; this covers the SW-side fallback for missing fields.)

#### Scenarios
- Payload without any of the 4 flags → `requireInteraction: true`, `vibrate: [200, 100, 200, 100, 200]`, `renotify: true`, `badge: '/pwa-192x192.png'` all applied; notification sticky and re-alerting.
- Payload with `vibrate: false` → `vibrate` key omitted; other three still default to TRUE if absent.

### R3 (new): An in-app intake modal SHALL render for iOS users on the deep-link route

When user navigates to `/today?tomaId=<uuid>&action=<taken|snooze|skip>` AND platform is iOS Safari (where `Notification.actions` is unsupported), the app SHALL render an on-screen modal with the three action buttons for that toma. On non-iOS, the auto-trigger from `intake-deep-link` is sufficient; the modal is NOT required.

#### Scenarios
- iOS Safari standalone + push WITHOUT action buttons (iOS limitation) + user taps body → SW opens app to `/today?tomaId=<uuid>`; app displays an in-app modal with the three action buttons; user can tap a button to dispatch the action without leaving the Today view.
- Android Chrome + SW opens app to `/today?tomaId=<uuid>&action=taken` → app auto-triggers `taken` on mount; no extra modal rendered.

## MODIFIED Requirements: None.
## REMOVED Requirements: None.
## RENAMED Requirements: None.
