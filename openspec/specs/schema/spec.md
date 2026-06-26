<!-- Synced from openspec/changes/web-push-notifications/ on 2026-06-26. Source-of-truth delta. -->
# Schema Reference — Complete Database Specification

## Purpose

Consolidated single-file reference of every Postgres table, column, type, FK, and index for `medication-tracker-pwa`. This file is the authoritative schema source for sdd-apply. Tables are grouped by domain with cross-links to the originating spec file.

---

## Domain: Auth (auth/spec.md)

### Table: `auth.users` (managed by Supabase)

Supabase Auth manages users. The app uses `auth.users.id` as the primary user identifier via `auth.uid()`.

---

## Domain: Family (family/spec.md)

### Table: `pacientes`

The central patient entity. Defined in family/spec.md; columns proposed here as consolidated from family/spec.md and plan-temporada/spec.md references.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `cuidador_id` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `name` | `text` | NOT NULL |
| `dob` | `date` | NULL |
| `photo_url` | `text` | NULL |
| `timezone_id` | `text` | NOT NULL, default `'America/Buenos_Aires'` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### Table: `family_members`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `user_id` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `role` | `text` | NOT NULL — enum: `owner_paciente`, `cuidador_principal`, `cuidador_secundario`, `medico` |
| `status` | `text` | NOT NULL, default `'pending'` — `pending`, `active`, `revoked` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

---

## Domain: Plan / Temporada (plan-temporada/spec.md)

### Table: `temporadas`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `name` | `text` | NOT NULL |
| `start_date` | `date` | NOT NULL |
| `end_date` | `date` | NOT NULL |
| `closed_at` | `timestamptz` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### Table: `plans`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `temporada_id` | `uuid` | FK to `temporadas.id`, NULL |
| `is_permanent` | `boolean` | NOT NULL, default `false` |
| `notes` | `text` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

Constraint: `is_permanent = true` implies `temporada_id IS NULL`.

---

## Domain: Medication (medication/spec.md)

### Table: `medications`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `name` | `text` | NOT NULL |
| `dose_value` | `numeric` | NOT NULL |
| `dose_unit` | `text` | NOT NULL — from dose-units enum or `"other"` |
| `dose_unit_other` | `text` | NULL |
| `route` | `text` | NOT NULL |
| `frequency_hint` | `text` | NULL |
| `notes` | `text` | NULL |
| `photo_url` | `text` | NULL |
| `stock_estimate` | `integer` | NOT NULL, default `0`, MUST be >= 0 |
| `low_stock_threshold` | `integer` | NOT NULL, default `7`, MUST be >= 0 |
| `active` | `boolean` | NOT NULL, default `true` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

---

## Domain: Schedule (schedule/spec.md)

### Table: `schedules`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `medication_id` | `uuid` | FK to `medications.id`, NOT NULL |
| `time_of_day` | `time` | NOT NULL |
| `weekday_mask` | `integer` | NOT NULL, 0–127 bitfield (Sun=0 … Sat=6) |
| `timezone_id` | `text` | NOT NULL, default paciente's `timezone_id` |
| `active` | `boolean` | NOT NULL, default `true` |
| `notes` | `text` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

---

## Domain: Intake (intake/spec.md)

### Table: `tomas`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `schedule_id` | `uuid` | FK to `schedules.id`, NOT NULL |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `scheduled_at` | `timestamptz` | NOT NULL |
| `status` | `text` | NOT NULL — enum: `pending`, `taken_on_time`, `taken_late`, `skipped`, `missed` |
| `taken_at` | `timestamptz` | NULL |
| `snoozed_until` | `timestamptz` | NULL |
| `skip_reason` | `text` | NULL |
| `registered_by` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `notes` | `text` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

Uniqueness: `(schedule_id, scheduled_at)` — upsert semantics.

---

## Domain: Reminder (reminder/spec.md)

### Table: `notification_settings`

Per-paciente and per-medication notification overrides.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `medication_id` | `uuid` | FK to `medications.id`, NULL — NULL means global paciente setting |
| `channel` | `text` | NOT NULL — enum: `in_app`, `email`, `sms`, `web_push` |
| `enabled` | `boolean` | NOT NULL, default `true` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

Unique constraint: `(paciente_id, medication_id, channel)` where `medication_id` can be NULL.

### Table: `push_subscriptions`

Web Push subscription store, keyed by user and device. Defined in reminder/spec.md.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `endpoint` | `text` | NOT NULL, UNIQUE |
| `p256dh` | `text` | NOT NULL |
| `auth` | `text` | NOT NULL |
| `device_name` | `text` | NULL |
| `is_active` | `boolean` | NOT NULL, default `true` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `last_seen_at` | `timestamptz` | NULL |

### Table: `notification_deliveries`

Delivery audit log for Web Push attempts. Defined in reminder/spec.md. Channel is `text` (not enum) to avoid the enum ALTER TYPE tx hazard in 0013 — the Edge Function casts at INSERT time.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `toma_id` | `uuid` | FK to `tomas.id`, NOT NULL |
| `subscription_id` | `uuid` | FK to `push_subscriptions.id`, NOT NULL |
| `channel` | `text` | NOT NULL |
| `sent_at` | `timestamptz` | NOT NULL, default `now()` |
| `status` | `text` | NOT NULL, CHECK (`status IN ('success', 'failure')`) |
| `error_message` | `text` | NULL |

---

## Domain: Stock (stock/spec.md)

### Table: `stock_adjustments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `medication_id` | `uuid` | FK to `medications.id`, NOT NULL |
| `previous_estimate` | `integer` | NOT NULL |
| `new_estimate` | `integer` | NOT NULL |
| `reason` | `text` | NOT NULL |
| `adjusted_by` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

---

## Domain: Adherence (adherence/spec.md)

### Table: `adherence_daily` (optional daily rollup)

Populated by a nightly scheduled function. Not required for correctness; enables fast dashboard queries.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `date` | `date` | NOT NULL |
| `taken_on_time` | `integer` | NOT NULL, default `0` |
| `taken_late` | `integer` | NOT NULL, default `0` |
| `missed` | `integer` | NOT NULL, default `0` |
| `skipped` | `integer` | NOT NULL, default `0` |
| `rollup_computed_at` | `timestamptz` | NOT NULL, default `now()` |

Unique constraint: `(paciente_id, date)`.

---

## Domain: Interaction (interaction/spec.md)

### Table: `interactions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `drug_a` | `text` | NOT NULL — normalized medication name |
| `drug_b` | `text` | NOT NULL — normalized medication name |
| `severity` | `text` | NOT NULL — enum: `info`, `caution`, `warning`, `severe` |
| `description` | `text` | NOT NULL |
| `source_notes` | `text` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

Unique constraint: `(drug_a, drug_b)` with canonical alphabetical ordering.

---

## Domain: Vacation (vacation/spec.md)

### Table: `vacations`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `medication_id` | `uuid` | FK to `medications.id`, NULL — NULL = GLOBAL |
| `starts_at` | `timestamptz` | NOT NULL |
| `ends_at` | `timestamptz` | NOT NULL |
| `reason` | `text` | NULL |
| `created_by` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

Overlap constraint: no two GLOBAL vacations for the same `paciente_id` may overlap; no two PER_MEDICATION vacations for the same `medication_id` may overlap.

---

## Domain: Retention (retention/spec.md)

### Table: `retention_policies`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NULL — NULL = global default |
| `retention_days` | `integer` | NOT NULL, default `730`, MUST be > 0 |
| `created_by` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

Unique constraint: `(paciente_id)` where `paciente_id IS NOT NULL`.

### Table: `tomas_archive`

Mirrors `tomas` schema plus `archived_at`. Separate from `tomas` to keep live table small.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `schedule_id` | `uuid` | FK to `schedules.id`, NOT NULL |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `scheduled_at` | `timestamptz` | NOT NULL |
| `status` | `text` | NOT NULL |
| `taken_at` | `timestamptz` | NULL |
| `snoozed_until` | `timestamptz` | NULL |
| `skip_reason` | `text` | NULL |
| `registered_by` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `notes` | `text` | NULL |
| `created_at` | `timestamptz` | NOT NULL |
| `updated_at` | `timestamptz` | NOT NULL |
| `archived_at` | `timestamptz` | NOT NULL, default `now()` |

---

## Enums and Seed Data

### Dose Units (medication/spec.md)

Initial seed list: `mg`, `ml`, `gotas`, `UI`, `comprimidos`, `parches`, `sobres`, `cucharadas`, `aplicaciones`, `inyecciones`, `otro`

### Weekday Tokens

Numeric bitfield encoding: `0 = Sunday`, `1 = Monday`, `2 = Tuesday`, `3 = Wednesday`, `4 = Thursday`, `5 = Friday`, `6 = Saturday`.

Common masks:
- Every day: `127`
- Mon–Fri: `62`
- Mon/Wed/Fri: `42`
- Weekends: `65`

### Intake Status Values

`pending`, `taken_on_time`, `taken_late`, `skipped`, `missed`

### Interaction Severity Values

`info`, `caution`, `warning`, `severe`

### Family Role Values

`owner_paciente`, `cuidador_principal`, `cuidador_secundario`, `medico`

### Family Membership Status Values

`pending`, `active`, `revoked`

### Notification Channel Values

`in_app`, `email`, `sms`, `web_push`

---

## Indexes

Recommended indexes for common query patterns:

| Table | Index | Purpose |
|-------|-------|---------|
| `medications` | `(paciente_id)` | List medications per patient |
| `medications` | `(paciente_id, active)` | Active medications per patient |
| `schedules` | `(medication_id, active)` | Active schedules per medication |
| `schedules` | `(paciente_id)` via medication FK | Schedules per patient |
| `tomas` | `(schedule_id, scheduled_at)` | Unique constraint enforcement; schedule history |
| `tomas` | `(paciente_id, scheduled_at)` | Adherence query; date-range reports |
| `tomas` | `(paciente_id, status)` | Filter tomas by status |
| `tomas_archive` | `(paciente_id, scheduled_at)` | Archive queries |
| `tomas_archive` | `(archived_at)` | Hard-delete purge |
| `vacations` | `(paciente_id, starts_at, ends_at)` | Active vacation lookup |
| `vacations` | `(medication_id, starts_at, ends_at)` | Per-medication vacation lookup |
| `retention_policies` | `(paciente_id)` | Per-paciente policy lookup |
| `family_members` | `(user_id, status)` | Active family membership lookup |
| `family_members` | `(paciente_id, user_id)` | Role lookup per patient |
| `notification_settings` | `(paciente_id, medication_id)` | Setting lookup |
| `push_subscriptions` | `(user_id, is_active)` | Active subscriptions per user |
| `push_subscriptions` | `(endpoint)` | Unique endpoint lookup for deduplication |
| `notification_deliveries` | `(subscription_id, sent_at)` | Delivery audit per subscription |
| `notification_deliveries` | `(toma_id)` | Per-toma delivery lookup |
| `interactions`      | `(drug_a, drug_b)`          | Interaction lookup with canonical ordering |
| `temporadas` | `(paciente_id, closed_at)` | Open temporada per patient |

---

## RLS Policy Intent

sdd-apply translates these into actual Postgres RLS policies. All tables have RLS enabled.

| Table | Read | Write |
|-------|------|-------|
| `pacientes` | Owner (`cuidador_id`) + active `family_members` | `cuidador_principal` only |
| `family_members` | Same patient via `family_members` | `cuidador_principal` only |
| `medications` | Same patient via `family_members` | `cuidador_principal` only |
| `schedules` | Same patient via `family_members` | `cuidador_principal` only |
| `tomas` | Same patient via `family_members` | All active family members INSERT; `cuidador_principal` or `registered_by` UPDATE |
| `notification_settings` | Same patient via `family_members` | `cuidador_principal` only |
| `push_subscriptions` | Owner (user_id = auth.uid()) reads own rows; cuidador_principal reads family via subquery | Owner (insert/update own rows) |
| `notification_deliveries` | Family read via `is_active_family_member` | Insert gated by family membership |
| `stock_adjustments` | Same patient via `family_members` | `cuidador_principal` only |
| `adherence_daily` | Same patient via `family_members` | System only (scheduled function) |
| `interactions` | All authenticated users (read-only curated list) | `cuidador_principal` only |
| `vacations` | Same patient via `family_members` | `cuidador_principal` only |
| `retention_policies` | Same patient via `family_members` | `cuidador_principal` only |
| `tomas_archive` | Same patient via `family_members` | System only (scheduled function) |
| `temporadas` | Same patient via `family_members` | `cuidador_principal` only |
| `plans` | Same patient via `family_members` | `cuidador_principal` only |