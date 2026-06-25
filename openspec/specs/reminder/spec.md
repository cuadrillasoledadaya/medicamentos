# Reminder / Notification Domain Specification

## Purpose

Defines the notification strategy using Web Notifications API + Service Worker (Workbox), notification channels, per-paciente and per-medication overrides, iOS PWA limitations, and action buttons.

---

## Requirements

### Requirement: Notification Channels

The system SHALL support three notification channels:

| Channel | Default | Activation |
|---------|---------|------------|
| `in_app` | ON | Always available |
| `email` | OFF | User-activated in settings |
| `sms` | OFF | User-activated in settings |

A `notification_settings` table SHALL store per-paciente and per-medication overrides.

### Requirement: Notification Trigger

The system SHALL fire a Web Notification when a `pending` toma enters its tolerance window (`scheduled_at - 0 min` to `scheduled_at + 15 min`). The Service Worker SHALL display the notification using `self.registration.showNotification()`.

#### Scenario: Notification fires at scheduled time

- GIVEN a schedule fires a toma at `scheduled_at = 08:00`
- WHEN the current time reaches `07:59` (1 minute before)
- THEN the Service Worker SHALL show a notification with the medication name and scheduled time

### Requirement: Notification Action Buttons

Each notification SHALL include three action buttons:

1. **"Marcar como tomada"** — logs a `taken` event via `clients.matchAll()` and closes the notification
2. **"Posponer 10 min"** — sets `snoozed_until = scheduled_at + 10 min` on the toma and reschedules the notification
3. **"Saltar"** — marks the toma as `skipped` with no reason and closes the notification

#### Scenario: Mark as taken via notification action

- GIVEN a notification is displayed for a pending toma
- WHEN the user taps "Marcar como tomada"
- THEN the Service Worker SHALL call the intake API to set `status = taken_on_time` and `taken_at = now()`
- AND close the notification

### Requirement: iOS PWA Limitation (Known Constraint)

Web Notifications on iOS Safari and iOS PWA (standalone) are unreliable when the app is backgrounded: `Notification.permission` may be granted but `showNotification` may not fire. The system SHALL mitigate this with the following fallback strategy:

- **Primary**: In-app dashboard alert — the PWA landing screen SHALL display a banner listing all `pending` tomas for the current day, sorted by time
- **Secondary**: Email notification via Supabase Edge Function (activated by user opt-in)
- **Tertiary**: SMS via Supabase Edge Function and a configured SMS provider (Twilio or similar; user provides credentials)
- The caregiver dashboard SHALL display a "notification status" indicator: green (notification likely delivered), yellow (iOS — in-app only), red (permission denied)

#### Scenario: iOS notification fallback

- GIVEN a user opens the PWA on iOS Safari and the app is backgrounded
- WHEN a scheduled notification time arrives
- THEN the in-app banner on the dashboard SHALL display the pending tomas
- AND no relying party SHALL expect a system-level notification to appear

### Requirement: Per-Medication Override

A `cuidador_principal` SHALL be able to disable notifications for a specific medication while keeping them enabled for others.

#### Scenario: Disable notifications per medication

- GIVEN a paciente has notifications enabled globally
- WHEN a cuidador disables notifications for medication "Metformin"
- THEN no system notifications SHALL fire for Metformin's schedules
- AND the in-app dashboard banner SHALL still show the pending tomas for Metformin
