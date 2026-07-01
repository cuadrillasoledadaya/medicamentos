<!-- Synced from openspec/changes/fix-web-push-subscribe/ on 2026-06-28. Source-of-truth delta. -->
# Push Subscription UX Domain Specification

## Purpose

Defines the user experience for Web Push subscription management: decoupling preference-save from the push handshake, translating failure reasons into user-friendly Spanish messages with retry actions, and surfacing subscription state visually as a badge.

---

## Requirements

### Requirement: Push subscription preference is saved independently of handshake success

The system SHALL persist the user's `web_push` preference in `notification_settings` BEFORE attempting the push handshake, so that a successful preference-save is NOT coupled to a successful `pushManager.subscribe()` call.

#### Scenario: User enables web_push in incognito and push handshake fails

- GIVEN the user is on the Notification Settings page
- AND `requestPushSubscription()` will reject (e.g. `NotAllowedError` in Chrome incognito)
- WHEN the user toggles the `web_push` checkbox to ON
- THEN the system SHALL call `updateMutation.mutate({channel:'web_push', enabled:true})` BEFORE calling `requestPushSubscription()`
- AND the `notification_settings` row for `(paciente_id, channel='web_push')` SHALL be created with `enabled = true`
- AND when the push handshake subsequently fails, the checkbox SHALL remain visually checked
- AND a visible warning banner SHALL appear in the form indicating that the push handshake did not complete

#### Scenario: User enables web_push and push handshake succeeds

- GIVEN `requestPushSubscription()` will resolve successfully
- WHEN the user toggles the `web_push` checkbox to ON
- THEN the `notification_settings` row SHALL be created with `enabled = true` (mutate first)
- AND a `push_subscriptions` row SHALL be inserted with the device's endpoint and keys (subscribe second)

#### Scenario: User disables web_push

- GIVEN the `web_push` preference is currently `enabled = true`
- WHEN the user toggles the `web_push` checkbox to OFF
- THEN the `notification_settings` row SHALL be updated to `enabled = false`
- AND no push handshake SHALL be attempted
- AND if a `push_subscriptions` row exists, the system SHALL NOT call `pushManager.unsubscribe()` automatically (the user must use the explicit "Revoke" action on the device)

---

### Requirement: Push handshake failures are translated and visible

The system SHALL map known `DOMException` names and platform-specific failure reasons returned by `requestPushSubscription()` to friendly Spanish messages, and SHALL surface them as a visible warning banner with a "Reintentar" action.

Raw exception names SHALL NOT be rendered to the user.

#### Scenario: NotAllowedError (permission denied, e.g. incognito)

- WHEN `requestPushSubscription()` returns `{ok:false, reason:'NotAllowedError'}`
- THEN the warning banner SHALL display the Spanish message: `"Tu navegador bloqueó la suscripción. Usá una ventana normal o verificá los permisos."`
- AND the banner SHALL include a "Reintentar" button
- AND the raw string `NotAllowedError` SHALL NOT be visible to the user

#### Scenario: AbortError (subscription cancelled)

- WHEN `requestPushSubscription()` returns `{ok:false, reason:'AbortError'}`
- THEN the warning banner SHALL display the Spanish message: `"La suscripción se canceló. Intentá de nuevo."`
- AND the banner SHALL include a "Reintentar" button

#### Scenario: SecurityError (HTTP non-SSL or iframe context)

- WHEN `requestPushSubscription()` returns `{ok:false, reason:'SecurityError'}`
- THEN the warning banner SHALL display the Spanish message: `"La suscripción push no está disponible en este contexto (HTTP sin SSL o iframe)."`
- AND the banner SHALL include a "Reintentar" button

#### Scenario: Unknown error reason

- WHEN `requestPushSubscription()` returns `{ok:false, reason:<unmapped>}` or `{ok:false, reason:<missing>}`
- THEN the warning banner SHALL display the Spanish message: `"No se pudo activar las notificaciones push. Intentá de nuevo."`
- AND the raw reason SHALL be logged to the browser console via `console.warn(reason, {userAgent})` for debugging
- AND the banner SHALL include a "Reintentar" button

---

### Requirement: Subscription state is visible as a badge

The system SHALL display a small badge next to the `web_push` label reflecting the current push subscription state. The badge SHALL transition through `pending` → `subscribed` (success) or `pending` → `failed` (failure), and SHALL also be re-evaluable via the "Reintentar" action without re-toggling the checkbox.

#### Scenario: Badge reflects pending, subscribed, and failed states

- GIVEN the user has toggled `web_push` to ON
- WHEN the push handshake is in flight
- THEN the badge SHALL show a `pending` state (e.g. spinner or text "Pendiente…")
- WHEN the push handshake completes successfully
- THEN the badge SHALL transition to a `subscribed` state (e.g. green dot or text "Push activo")
- WHEN the push handshake fails
- THEN the badge SHALL transition to a `failed` state (e.g. yellow dot or text "Push no configurado")
- AND the badge SHALL remain in `failed` state (NOT auto-revert) until the user clicks "Reintentar" or re-toggles the checkbox

#### Scenario: "Reintentar" re-runs the handshake without re-toggling the checkbox

- GIVEN the `web_push` checkbox is checked AND the badge is in `failed` state
- WHEN the user clicks the "Reintentar" button in the warning banner
- THEN the system SHALL call `requestPushSubscription()` again
- AND the system SHALL NOT re-call `updateMutation.mutate()` (the preference is already saved)
- AND the badge SHALL transition to `pending` then to `subscribed` or `failed` based on the new handshake result

---

### Requirement: Subscribe handshake always upserts to push_subscriptions

The system SHALL upsert the normalized subscription to `push_subscriptions` on every subscribe handshake, regardless of whether `registration.pushManager.getSubscription()` returns an existing subscription or a new one. The upsert SHALL use `onConflict: 'endpoint'` and SHALL include `user_id`, `endpoint`, `p256dh`, `auth`, `device_name`, `is_active = true`, and `last_seen_at = now()`.

#### Scenario: Re-toggle restores DB row after manual delete

- GIVEN the user has previously subscribed AND the corresponding `push_subscriptions` row has been deleted (e.g. `DELETE FROM push_subscriptions` for VAPID debugging)
- WHEN the user toggles `web_push` OFF then ON
- THEN the client SHALL detect the cached `PushSubscription` from `pushManager.getSubscription()`
- AND SHALL upsert it to `push_subscriptions` using `onConflict: 'endpoint'`
- AND a row matching the existing browser endpoint SHALL appear in `push_subscriptions` with `is_active = true`

#### Scenario: Fresh first-time subscription

- GIVEN `pushManager.getSubscription()` returns `null` (no cached subscription)
- WHEN the user toggles `web_push` ON for the first time
- THEN the client SHALL call `pushManager.subscribe()` with the VAPID public key
- AND SHALL upsert the resulting normalized subscription to `push_subscriptions` (the upsert inserts a new row since no conflict exists)
- AND the badge SHALL transition to `subscribed` ("Push activo")

#### Scenario: Multi-tab race — two tabs subscribe simultaneously

- GIVEN two browser tabs are open with the same user logged in
- WHEN both tabs call `subscribeToPush` within milliseconds of each other
- THEN both upserts SHALL succeed at the DB level (PostgreSQL `ON CONFLICT DO UPDATE` is atomic)
- AND the final row state SHALL reflect the last writer's values for `p256dh`, `auth`, `device_name`, `is_active`, and `last_seen_at`

---

### Requirement: Upsert refreshes auth keys and metadata on conflict

When the upsert finds an existing row by `endpoint`, the system SHALL update `p256dh`, `auth`, `device_name`, `is_active`, and `last_seen_at` to the current values. The system SHALL preserve `created_at` and `id` on the existing row (the DB enforces this via `ON CONFLICT DO UPDATE`).

#### Scenario: Browser session rotates p256dh/auth keys

- GIVEN a `push_subscriptions` row already exists for the user's current endpoint
- AND the browser has rotated its VAPID-derived keys (e.g. new session, different crypto context)
- WHEN the user toggles `web_push` ON
- THEN the upsert SHALL update the row's `p256dh` and `auth` columns to the new values
- AND SHALL update `last_seen_at` to `now()`
- AND SHALL NOT modify `created_at` or `id`

---

### Requirement: Upsert failure rolls back the browser subscription

When the upsert to `push_subscriptions` fails for any reason (RLS rejection, network error, unique violation, etc.), the system SHALL call `subscription.unsubscribe()` to remove the browser-side subscription, SHALL throw an error to surface the failure to the UI, and SHALL NOT leave an orphan browser subscription pointing at a missing DB row.

#### Scenario: Supabase upsert returns a non-null error

- GIVEN the client has successfully obtained a `PushSubscription` (either from `pushManager.getSubscription()` or `pushManager.subscribe()`)
- AND the Supabase upsert call returns `{ error }` with a non-null error
- WHEN `subscribeToPush` processes the result
- THEN the system SHALL call `subscription.unsubscribe()` to remove the browser subscription
- AND SHALL throw an `Error` containing the Supabase error message
- AND the UI SHALL surface the failure through the existing warning-banner flow (per the "Push handshake failures are translated and visible" requirement in the main spec)

---

### Requirement: Schema migration 0021 is captured in the repository

The repository's migration history SHALL include `supabase/migrations/0021_notification_settings_unique_fix.sql` declaring the `notification_settings_unique` constraint as `UNIQUE NULLS NOT DISTINCT (paciente_id, medication_id, channel)`. The migration SHALL be idempotent so that it can be safely applied on databases where the constraint already exists.

#### Scenario: Migration is idempotent and the constraint is correct

- WHEN migration `0021_notification_settings_unique_fix.sql` is applied to a database
- THEN the `notification_settings_unique` constraint SHALL end in the state `UNIQUE NULLS NOT DISTINCT (paciente_id, medication_id, channel)`
- AND applying the migration a second time SHALL complete without error (using `DROP CONSTRAINT IF EXISTS` before re-adding)
- AND the client's upsert with `onConflict: 'paciente_id,medication_id,channel'` SHALL correctly update an existing row instead of inserting a duplicate when `medication_id` is NULL

