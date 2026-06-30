<!-- Delta spec. Synced to openspec/specs/intake-deep-link/spec.md on 2026-07-01. -->
# Spec: intake-deep-link (NEW)

## Purpose

Defines a real, deep-linkable SPA route that Web Push notifications can open. Replaces the hardcoded `action_url: "/today"` (which 404s to `NotFoundPage`) and provides a place to auto-trigger the action (`taken` / `snooze` / `skip`) when the app is launched from a push while it was closed. Also serves as the in-app entry point on iOS Safari, where `Notification.actions` is unsupported.

## Requirements (4)

### R1: A `/today` route SHALL exist in the SPA router

react-router-dom v7 router SHALL define `/today` inside the authenticated shell. Without query, renders the Today view. With `?tomaId=<uuid>`, the specific toma is highlighted (no separate page).

#### Scenarios
- Authenticated user at `/today` → Today view renders, NOT `NotFoundPage`.
- Authenticated user at `/today?tomaId=<uuid>` with that toma pending today → Today view renders AND that toma is visually highlighted (background, border, or scroll-into-view).

### R2: The `/today` route SHALL auto-trigger the action encoded in `?action=`

When URL is `/today?tomaId=<uuid>&action=<taken|snooze|skip>`, the route SHALL dispatch the corresponding action exactly once after mount + toma data available. No extra click required.

#### Scenarios
- App closed, user tapped "Marcar como tomada" push → SW opens `/today?tomaId=<uuid>&action=taken` → on mount the app marks the toma as taken via the intake API; toma shows as `taken` in Today view.
- App closed, user tapped "Posponer 10 min" push → SW opens `/today?tomaId=<uuid>&action=snooze` → on mount the app calls `snooze_toma` RPC; toma persisted with `snoozed_until = now() + 10 minutes`.
- App closed, user tapped "Saltar" push → SW opens `/today?tomaId=<uuid>&action=skip` → on mount the app marks the toma as skipped with `skip_reason = 'notification-skip'`.

### R3: The SW SHALL open `/today?tomaId=...&action=...` for every push interaction

SW `notificationclick` SHALL call `clients.openWindow('/today?tomaId=<uuid>&action=<a>')` for action taps, and `clients.openWindow('/today?tomaId=<uuid>')` for body taps. Window opened BEFORE `postMessage` so the message reaches a live client even when the app was fully closed.

#### Scenarios
- Body tap → `clients.openWindow('/today?tomaId=<uuid>')`; app lands on Today view with toma highlighted.
- Snooze action tap → `clients.openWindow('/today?tomaId=<uuid>&action=snooze')`; app auto-triggers snooze RPC on mount.

### R4: The `action_url` field in the push payload SHALL point to a real route

`buildPushPayload` in the client AND the mirror in the Edge Function SHALL set `action_url` to a real deep-linkable route. Default SHALL be `/today`.

#### Scenarios
- Complete toma row + `buildPushPayload(toma, settings)` → object has `action_url: '/today'` AND payload stays under 500 bytes (existing size contract preserved).
