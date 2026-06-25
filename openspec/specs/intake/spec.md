# Intake Domain Specification

## Purpose

Defines the `tomas` (intake events) entity, status enum, tolerance windows, and idempotency rules. A toma slot is generated from a `schedule` at a specific UTC timestamp.

---

## Requirements

### Requirement: Toma Entity

The system SHALL persist a `tomas` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `schedule_id` | `uuid` | FK to `schedules.id`, NOT NULL |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `scheduled_at` | `timestamptz` | NOT NULL |
| `status` | `text` | NOT NULL, enum: `pending`, `taken_on_time`, `taken_late`, `skipped`, `missed` |
| `taken_at` | `timestamptz` | NULL |
| `snoozed_until` | `timestamptz` | NULL |
| `skip_reason` | `text` | NULL |
| `registered_by` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `notes` | `text` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

### Requirement: Status Thresholds

The system SHALL compute toma status using the following rules:

- `taken_on_time`: `taken_at` is within ±15 minutes of `scheduled_at`
- `taken_late`: `taken_at` is more than 15 minutes after `scheduled_at`
- `skipped`: user explicitly marked as skipped with a reason
- `missed`: `taken_at` is NULL and the tolerance window (scheduled_at + 15 min, or snoozed_until + 15 min if snoozed) has passed
- `pending`: not yet resolved and within the tolerance window

#### Scenario: Taken on time

- GIVEN a toma with `scheduled_at = 08:00`
- WHEN a user logs a toma at `taken_at = 07:50`
- THEN status SHALL be `taken_on_time`

#### Scenario: Taken late

- GIVEN a toma with `scheduled_at = 08:00`
- WHEN a user logs a toma at `taken_at = 08:25`
- THEN status SHALL be `taken_late`

#### Scenario: Missed

- GIVEN a toma with `scheduled_at = 08:00` and no snooze
- WHEN no `taken_at` is recorded by `08:16`
- THEN status SHALL be `missed`

### Requirement: Idempotency

A single scheduled slot (same `schedule_id` + `scheduled_at`) MUST have at most one `tomas` row. Upsert semantics apply: creating a second event for the same slot replaces the existing row.

#### Scenario: Idempotent upsert

- GIVEN a pending toma exists for `schedule_id = X` at `scheduled_at = 08:00`
- WHEN a notification action logs a `taken` event for the same slot
- THEN the system SHALL replace the existing row's `status` and `taken_at`, not create a duplicate row
