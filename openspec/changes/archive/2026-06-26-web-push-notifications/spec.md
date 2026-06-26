# Delta Spec: web-push-notifications

## MODIFIED Requirements

### Requirement: Notification Channels

The system SHALL support four notification channels:

| Channel | Default | Activation |
|---------|---------|------------|
| `in_app` | ON | Always available |
| `email` | OFF | User-activated in settings |
| `sms` | OFF | User-activated in settings |
| `web_push` | OFF | User-activated per device in settings |

A `notification_settings` table SHALL store per-paciente and per-medication overrides.

A `push_subscriptions` table SHALL store Web Push subscription objects per user per device, keyed by user ID.

(Previously: three channels — in_app, email, sms — with no push_subscriptions table)

#### Scenario: Web push channel can be enabled per paciente

- GIVEN a caregiver is on the Notification Settings page for a paciente
- WHEN they toggle `web_push` to ON for that paciente
- THEN the system SHALL create an active `push_subscriptions` row for the current user and device
- AND the browser permission prompt SHALL fire

#### Scenario: Web push channel requires browser permission

- GIVEN a caregiver has not yet granted notification permission in the browser
- WHEN they toggle `web_push` to ON
- THEN the browser's native permission prompt SHALL appear
- IF the user denies permission: no push_subscriptions row is created and the toggle reverts to OFF
- IF the user grants permission: a push_subscriptions row is created and the toggle stays ON

---

### Requirement: Notification Channel Values

The `notification_channel` enum values SHALL be: `in_app`, `email`, `sms`, `web_push`.

(Previously: `in_app`, `email`, `sms`)

---

## ADDED Requirements

### Requirement: VAPID Public Key Distribution

The system SHALL expose the VAPID public key to the client at build time via the `VITE_VAPID_PUBLIC_KEY` environment variable.

The client SHALL use this key when calling `pushManager.subscribe()`.

#### Scenario: Client reads VAPID key from environment

- GIVEN the frontend build includes `VITE_VAPID_PUBLIC_KEY=BCk…`
- WHEN the NotificationSettingsForm component mounts
- THEN it SHALL read `import.meta.env.VITE_VAPID_PUBLIC_KEY` for use in `pushManager.subscribe(options)`

---

### Requirement: Web Push Subscription Management

The system SHALL allow a user to create, list, and delete Web Push subscriptions for themselves.

#### Scenario: User subscribes to web push

- GIVEN `Notification.permission === 'granted'`
- WHEN the frontend calls `pushManager.subscribe()` with the VAPID key and `userVisibleOnly: true`
- THEN the resulting `PushSubscription` object SHALL be sent to the server
- AND the server SHALL store it in `push_subscriptions(user_id, endpoint, p256dh, auth, device_name, active)` with `active = true`

#### Scenario: User lists their active subscriptions

- GIVEN a user has one or more active push subscriptions
- WHEN they open the Notification Settings page
- THEN the UI SHALL display each subscription showing `device_name`, `created_at`, and a "Revoke" button

#### Scenario: User revokes a subscription

- GIVEN a user has an active subscription with `id = sub_abc`
- WHEN they click "Revoke" on that subscription
- THEN the system SHALL set `active = false` on that row
- AND the device SHALL receive no further push notifications
- AND the UI SHALL remove that subscription from the list

---

### Requirement: Scheduled Push Delivery

A pg_cron job SHALL run every 60 seconds and send a Web Push notification for every `pending` toma whose `scheduled_at` falls within the delivery window: `scheduled_at <= now() < scheduled_at + 5 minutes`.

For each qualifying toma, the system SHALL identify all `active` family members of the associated paciente and send one push notification per active subscription belonging to each family member.

#### Scenario: Push fires for a due toma

- GIVEN a toma exists with `status = 'pending'` and `scheduled_at = 08:00`
- WHEN the cron job runs at `08:02`
- THEN it SHALL find that toma (within the 5-min window)
- AND send a Web Push to every active subscription for each `active` family member of that paciente

#### Scenario: Push does not fire outside the delivery window

- GIVEN a toma exists with `status = 'pending'` and `scheduled_at = 08:00`
- WHEN the cron job runs at `08:06` (outside the 5-min window)
- THEN no push SHALL be sent for that toma

#### Scenario: Push only goes to active family members

- GIVEN a paciente has three family members: one `active`, one `pending`, one `revoked`
- WHEN a toma for that paciente is due
- THEN the push SHALL be sent only to subscriptions of the `active` family member

---

### Requirement: Push Payload Contract

Every Web Push payload sent to the Service Worker SHALL be a JSON object with this exact structure:

```json
{
  "notification_id": "<toma_id>",
  "type": "medication_reminder",
  "paciente_id": "<uuid>",
  "paciente_name": "string",
  "medication_name": "string",
  "dose": "string",
  "unit": "string",
  "scheduled_at": "ISO 8601 string",
  "action_url": "/today"
}
```

#### Scenario: SW receives valid push payload

- GIVEN the Edge Function sends a push with the above payload
- WHEN the Service Worker's `push` event handler receives the event
- THEN it SHALL parse `event.data.json()` and extract all fields
- AND use `notification_id` for deduplication

#### Scenario: SW handles malformed push payload

- GIVEN the Edge Function sends a push with a missing `notification_id` field
- WHEN the Service Worker's `push` event handler receives the event
- THEN it SHALL NOT call `showNotification`
- AND SHALL log a warning for observability

---

### Requirement: Service Worker Push Handler

The Service Worker SHALL handle the `push` event by displaying a system notification with three action buttons and routing user interactions to the correct API endpoint.

#### Scenario: SW shows notification with action buttons

- GIVEN the SW receives a valid push payload
- WHEN it calls `self.registration.showNotification()`
- THEN the notification SHALL display `medication_name` and `dose` as the title and `scheduled_at` as the body
- AND include three action buttons: `action: 'taken'`, `action: 'snooze'`, `action: 'skip'`

#### Scenario: SW deduplicates by notification_id on the same device

- GIVEN the SW receives a push for `notification_id = abc` while a notification with tag `abc` is already visible
- WHEN `showNotification` is called with the same tag
- THEN the existing notification SHALL be replaced, not duplicated

#### Scenario: User taps "Taken" action button

- GIVEN a notification with action button `action: 'taken'` is displayed
- WHEN the user taps that button
- THEN the SW SHALL call `taken` API to set `status = taken_on_time` and `taken_at = now()`
- AND close the notification
- AND navigate the client to `/today`

#### Scenario: User taps "Snooze" action button

- GIVEN a notification with action button `action: 'snooze'` is displayed
- WHEN the user taps that button
- THEN the SW SHALL call `snooze` API to set `snoozed_until = now() + 10 minutes`
- AND close the notification

#### Scenario: User taps "Skip" action button

- GIVEN a notification with action button `action: 'skip'` is displayed
- WHEN the user taps that button
- THEN the SW SHALL call `skip` API to set `status = 'skipped'`
- AND close the notification
- AND navigate the client to `/today`

#### Scenario: User taps notification body (not an action button)

- GIVEN a notification is displayed
- WHEN the user taps the notification body (not an action button)
- THEN the SW SHALL open the app to `/today`

---

### Requirement: Subscription Pruning

When the Web Push service returns HTTP `410 Gone` or `404 Not Found` for a subscription, the system SHALL mark that subscription as `active = false`.

#### Scenario: Subscription marked inactive on 410

- GIVEN an active subscription has an expired or revoked endpoint
- WHEN the Edge Function sends a push and receives HTTP 410
- THEN it SHALL set `active = false` on that subscription row

#### Scenario: Subscription marked inactive on 404

- GIVEN an active subscription has a malformed endpoint
- WHEN the Edge Function sends a push and receives HTTP 404
- THEN it SHALL set `active = false` on that subscription row

---

### Requirement: iOS PWA Install Badge

The Notification Settings UI SHALL display an "Add to Home Screen" reminder to iOS users when `web_push` is enabled but the PWA is not installed as a standalone app.

#### Scenario: iOS user sees install reminder

- GIVEN `isIOS() === true` and the browser does not match `window.matchMedia('(display-mode: standalone)')`
- AND `web_push` is enabled for at least one paciente
- WHEN the Notification Settings page renders
- THEN a yellow info badge SHALL be shown: "To receive push notifications on iOS, tap Share → Add to Home Screen"

---

### Requirement: Delivery Audit

The system SHALL log every Web Push delivery attempt to a `notification_deliveries` table with the following fields: `id`, `toma_id`, `subscription_id`, `channel`, `sent_at`, `status` (`success` | `failure`), `error_message` (nullable).

#### Scenario: Successful delivery is logged

- GIVEN a push is successfully delivered to a subscription
- WHEN the Web Push service returns HTTP 200
- THEN the system SHALL insert a row into `notification_deliveries` with `status = 'success'` and `error_message = NULL`

#### Scenario: Failed delivery is logged

- GIVEN a push delivery fails (non-2xx response)
- WHEN the Web Push service responds
- THEN the system SHALL insert a row into `notification_deliveries` with `status = 'failure'` and `error_message` containing the response code or body