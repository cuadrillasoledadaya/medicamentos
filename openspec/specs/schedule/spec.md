# Schedule Domain Specification

## Purpose

Defines the `schedules` table for cron-like scheduling rules per medication, including timezone handling, weekday masks, snooze, skip-with-reason, and travel-adjustment semantics.

---

## Requirements

### Requirement: Schedule Entity

The system SHALL persist a `schedules` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `medication_id` | `uuid` | FK to `medications.id`, NOT NULL |
| `time_of_day` | `time` | NOT NULL |
| `weekday_mask` | `integer` | NOT NULL, 0–127 bitfield representing Sun–Sat |
| `timezone_id` | `text` | NOT NULL, default the paciente's `timezone_id` |
| `active` | `boolean` | NOT NULL, default `true` |
| `notes` | `text` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

`weekday_mask` encoding: bit 0 = Sunday, bit 1 = Monday, … bit 6 = Saturday. Mask `127` = every day, `62` = Mon–Fri.

#### Scenario: Create daily schedule

- GIVEN a medication exists and is active
- WHEN a `cuidador_principal` creates a schedule with `time_of_day = "08:00"` and `weekday_mask = 127`
- THEN the system SHALL generate a toma slot for every day at 08:00 in the specified timezone

#### Scenario: Create weekday-only schedule

- GIVEN a medication exists
- WHEN a schedule is created with `weekday_mask = 62` (Mon–Fri)
- THEN no toma slots SHALL be generated for Saturday or Sunday

### Requirement: Snooze

The system SHALL support a one-shot deferral (`snooze`) of a scheduled toma by 10 minutes. Snoozing does NOT create a new toma row; it extends the tolerance window for the existing pending toma.

#### Scenario: Snooze a scheduled toma

- GIVEN a `pending` toma at `scheduled_at = 08:00`
- WHEN a user triggers the "Posponer 10 min" action
- THEN the system SHALL record a `snoozed_until = 08:10` on the toma row and the `missed` threshold SHALL be evaluated against `08:10`

### Requirement: Skip With Reason

The system SHALL support a planned skip for a specific date. A skip-with-reason does NOT set status to `missed`; it sets status to `skipped` with an associated `skip_reason`.

#### Scenario: Skip with reason

- GIVEN a scheduled toma for today
- WHEN a user selects "Saltar" and provides a reason `"viajando"`
- THEN the toma status SHALL be `skipped` with `skip_reason = 'viajando'`

### Requirement: Travel Adjustment — Timezone Change

When a patient's `timezone_id` changes, the system SHALL keep all historical `tomas` rows in their original timezone and recompute upcoming `scheduled_at` values in the new timezone. The UI SHALL display both the original and adjusted time.

#### Scenario: Patient timezone changes

- GIVEN a paciente's `timezone_id` changes from `"America/Buenos_Aires"` to `"Europe/Madrid"`
- WHEN existing `schedules` are evaluated for future tomas
- THEN past tomas SHALL retain their original `scheduled_at` in `"America/Buenos_Aires"` and future tomas SHALL be computed in `"Europe/Madrid"`
- AND the UI SHALL display the new timezone alongside the local time for each upcoming toma
