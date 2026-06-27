# Delta Spec: web-push-ux-fixes

**Change**: web-push-ux-fixes  
**Source-of-truth**: `openspec/specs/reminder/spec.md` (synced from `openspec/changes/archive/2026-06-26-web-push-notifications/` on 2026-06-26)  
**Parent change**: `web-push-notifications` (archived 2026-06-26, verdict PASS_WITH_WARNINGS)

## Context

Four scenarios from `reminder/spec.md` are implemented incorrectly in `src/sw.ts` and `src/features/notifications/DeviceList.tsx`. The spec language is correct; the code does not match. This change fixes the code.

---

## MODIFIED Requirements

### Requirement: Service Worker Push Handler — "User taps 'Taken' action button"

**Spec text** (`reminder/spec.md`, line 206–212):

> GIVEN a notification with action button `action: 'taken'` is displayed  
> WHEN the user taps that button  
> THEN the SW SHALL call `taken` API to set `status = taken_on_time` and `taken_at = now()`  
> AND close the notification  
> AND navigate the client to `/today`

**Current implementation** (`src/sw.ts:165–167`): calls `postMessage` to the client but never calls `clients.openWindow('/today')`.

(Previously: postMessage only; no `clients.openWindow('/today')` call)

#### Scenario: User taps "Taken" → status updated AND client navigates to `/today`

- GIVEN a push notification with action button `action: 'taken'` is displayed by the SW
- WHEN the user taps the "Taken" action button
- THEN the SW SHALL send a `postMessage({type:'TAKEN', tomaId, takenAt})` to all controlled clients
- AND the SW SHALL call `event.waitUntil(clients.openWindow('/today'))` to navigate the client
- AND the notification SHALL be closed

---

### Requirement: Service Worker Push Handler — "User taps 'Skip' action button"

**Spec text** (`reminder/spec.md`, line 221–227):

> GIVEN a notification with action button `action: 'skip'` is displayed  
> WHEN the user taps that button  
> THEN the SW SHALL call `skip` API to set `status = 'skipped'`  
> AND close the notification  
> AND navigate the client to `/today`

**Current implementation** (`src/sw.ts:173–175`): calls `postMessage` to the client but never calls `clients.openWindow('/today')`.

(Previously: postMessage only; no `clients.openWindow('/today')` call)

#### Scenario: User taps "Skip" → status updated AND client navigates to `/today`

- GIVEN a push notification with action button `action: 'skip'` is displayed by the SW
- WHEN the user taps the "Skip" action button
- THEN the SW SHALL send a `postMessage({type:'SKIP', tomaId, reason})` to all controlled clients
- AND the SW SHALL call `event.waitUntil(clients.openWindow('/today'))` to navigate the client
- AND the notification SHALL be closed

---

### Requirement: Service Worker Push Handler — "User taps notification body (not an action button)"

**Spec text** (`reminder/spec.md`, line 229–233):

> GIVEN a notification is displayed  
> WHEN the user taps the notification body (not an action button)  
> THEN the SW SHALL open the app to `/today`

**Current implementation** (`src/sw.ts:160`): `if (!tomaId || !action) return;` — body taps are a no-op.

(Previously: early return with no action; notification body tap is ignored)

#### Scenario: User taps notification body → app opens to `/today`

- GIVEN a push notification is displayed by the SW
- WHEN the user taps the notification body (not an action button)
- THEN the SW SHALL call `event.waitUntil(clients.openWindow('/today'))`
- AND the notification SHALL be closed

---

### Requirement: Web Push Subscription Management — "User revokes a subscription"

**Spec text** (`reminder/spec.md`, line 124–130):

> GIVEN a user has an active subscription with `id = sub_abc`  
> WHEN they click "Revoke" on that subscription  
> THEN the system SHALL set `active = false` on that row  
> AND the device SHALL receive no further push notifications  
> AND the UI SHALL remove that subscription from the list

**Current implementation** (`src/features/notifications/DeviceList.tsx:78–83` + `api.ts:134–144`): calls `revokePushSubscription()` which sets `is_active=false` server-side, but never calls `PushSubscription.unsubscribe()` on the browser's local `pushManager`. The device remains subscribed at the browser/push-service level.

(Previously: server-side `is_active=false` only; local `PushSubscription.unsubscribe()` was never called)

#### Scenario: User revokes a device → server row deactivated AND local subscription terminated

- GIVEN a user has an active push subscription in `push_subscriptions` with `id = sub_abc`
- AND the browser's `pushManager` holds a live `PushSubscription` for the same endpoint
- WHEN the user clicks "Revoke" on that subscription in `DeviceList`
- THEN the browser SHALL call `PushSubscription.unsubscribe()` on the local subscription object
- AND the system SHALL set `is_active = false` on the `push_subscriptions` row for `sub_abc` in Supabase
- AND the device SHALL receive no further push notifications
- AND the UI SHALL remove that subscription from the list

#### Scenario: Revoke flow handles missing local subscription gracefully

- GIVEN a user has a `push_subscriptions` row with `is_active = true` but the browser's `pushManager` has no matching subscription (e.g., already expired or cleared)
- WHEN the user clicks "Revoke" on that subscription
- THEN the system SHALL still set `is_active = false` on the server row
- AND the UI SHALL remove that subscription from the list
- AND no error SHALL be shown to the user