# Vacation / Pause Mode Domain Specification

## Purpose

Defines the `vacations` table for pausing reminders and adherence tracking. Two scopes: GLOBAL (all medications) and PER_MEDICATION (single medication). Vacation skips are excluded from adherence calculations.

---

## Requirements

### Requirement: Vacation Entity

The system SHALL persist a `vacations` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `medication_id` | `uuid` | FK to `medications.id`, NULL — NULL means GLOBAL scope |
| `starts_at` | `timestamptz` | NOT NULL |
| `ends_at` | `timestamptz` | NOT NULL |
| `reason` | `text` | NULL |
| `created_by` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

A vacation is **active** when `now() >= starts_at AND now() <= ends_at`.

- GLOBAL: `medication_id IS NULL` — pauses all reminders and adherence tracking for the paciente
- PER_MEDICATION: `medication_id IS NOT NULL` — pauses only that medication's reminders

#### Scenario: Create global vacation

- GIVEN a `cuidador_principal` creates a vacation with `medication_id = NULL`, `starts_at = "2026-07-01 00:00:00"`, `ends_at = "2026-07-15 23:59:59"`
- WHEN the vacation is created
- THEN `medication_id` SHALL be NULL (GLOBAL scope)
- AND no notification SHALL fire for any medication of that paciente during the date range

#### Scenario: Create per-medication vacation

- GIVEN a paciente has an active medication "Metformin"
- WHEN a `cuidador_principal` creates a vacation with `medication_id = Metformin.id`
- THEN only Metformin SHALL be paused during the vacation period
- AND all other medications' reminders SHALL continue normally

### Requirement: Effects on Reminders

While a vacation is active, the system SHALL NOT send any notification for the affected scope (GLOBAL or PER_MEDICATION).

#### Scenario: Notification suppressed during vacation

- GIVEN a GLOBAL vacation is active from July 1–15 for a paciente
- WHEN a scheduled toma notification time arrives on July 5
- THEN no system notification SHALL fire for that paciente's medications

### Requirement: Auto-Skip of Scheduled Tomas

Tomas scheduled during an active vacation SHALL be auto-marked as `skipped` with `skip_reason = 'vacation'`. A nightly Supabase scheduled function SHALL run after midnight and write these skipped tomas for any date where `scheduled_at` falls within an active vacation's date range.

#### Scenario: Tomas auto-marked skipped during vacation

- GIVEN a GLOBAL vacation is active for July 1–15
- WHEN the nightly scheduled function runs on July 3
- THEN all pending tomas for that paciente with `scheduled_at` on July 1, 2, and 3 SHALL be updated to `status = 'skipped'` and `skip_reason = 'vacation'`

### Requirement: Effects on Adherence

Per the `adherence/spec.md`, tomas with `skip_reason = 'vacation'` SHALL be excluded from both the adherence numerator and denominator.

#### Scenario: Vacation skip excluded from adherence

- GIVEN a paciente has a 5-day GLOBAL vacation with 5 tomas auto-skipped as `skip_reason = 'vacation'`
- WHEN adherence is computed for the 28-day window covering those 5 days
- THEN those 5 skips SHALL NOT appear in the denominator or numerator

### Requirement: Vacation Overlap Rules

The system SHALL prevent two GLOBAL vacations for the same `paciente_id` from having overlapping date ranges. PER_MEDICATION vacations for the same `medication_id` SHALL also not overlap.

#### Scenario: Overlapping GLOBAL vacation rejected

- GIVEN a paciente has an existing GLOBAL vacation from July 1–15
- WHEN a `cuidador_principal` creates a second GLOBAL vacation from July 10–20 for the same paciente
- THEN the system SHALL reject the request with HTTP 409 and an error indicating date conflict

### Requirement: End-of-Vacation Resumption

When `now() > ends_at`, the vacation becomes inactive. Normal scheduling and reminder delivery SHALL resume automatically. No manual resumption action is required.

#### Scenario: Normal scheduling resumes after vacation ends

- GIVEN a vacation with `ends_at = "2026-07-15 23:59:59"`
- WHEN the system clock passes `2026-07-16 00:00:01`
- THEN notifications SHALL resume for all active schedules of that paciente
- AND newly scheduled tomas SHALL be `pending` (not auto-skipped)

### Requirement: Edit and Cancel Mid-Vacation

A vacation SHALL be editable while `now() < ends_at`. To cancel a vacation early, `ends_at` SHALL be set to `now()`.

#### Scenario: Cancel vacation mid-vacation

- GIVEN an active GLOBAL vacation with `ends_at = "2026-07-15 23:59:59"`
- WHEN a `cuidador_principal` cancels it
- THEN `ends_at` SHALL be set to `now()`
- AND the vacation SHALL become inactive immediately
- AND normal scheduling SHALL resume

#### Scenario: Edit vacation dates

- GIVEN a vacation with `starts_at = "2026-07-01"`, `ends_at = "2026-07-15"`
- WHEN `now() = "2026-07-05"` and the cuidador updates `ends_at` to `"2026-07-20"`
- THEN the vacation SHALL remain active until the new `ends_at`
- AND the nightly function SHALL apply the extended window