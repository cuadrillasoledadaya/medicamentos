# Data Retention Domain Specification

## Purpose

Defines two retention policies: (1) seasonal/closed temporadas lock their Plans and Tomas permanently as immutable medical records, and (2) a configurable per-paciente retention policy moves aged tomas to an archive table and purges archive older than a maximum age.

---

## Requirements

### Requirement: Closed Temporada Immutability

When a `temporada` is closed (`closed_at IS NOT NULL`), all associated `plans` rows and `tomas` rows SHALL become immutable. They are NEVER soft-archived or deleted — they are retained forever as a permanent medical record for that treatment cycle.

#### Scenario: Closed temporada plans are immutable

- GIVEN a `temporada` "Invierno 2026" is closed with `closed_at = "2026-09-01 00:00:00"`
- WHEN any attempt is made to UPDATE or DELETE a `plan` or `toma` linked to that temporada
- THEN the operation SHALL be denied
- AND the data SHALL remain unchanged

### Requirement: Retention Policy Entity

The system SHALL persist a `retention_policies` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NULL — NULL means global default |
| `retention_days` | `integer` | NOT NULL, default `730` (24 months), MUST be > 0 |
| `created_by` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

Default: a global default row with `paciente_id = NULL` and `retention_days = 730`. Per-paciente rows override the global default.

#### Scenario: Per-paciente retention override

- GIVEN a global default `retention_days = 730`
- WHEN a `cuidador_principal` creates a per-paciente policy with `retention_days = 365`
- THEN tomas for that paciente older than 365 days SHALL be archived first

### Requirement: Archive Table Schema

The system SHALL maintain a `tomas_archive` table that mirrors the `tomas` schema:

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

`archived_at` records when the row was moved to the archive. The `tomas_archive` table SHALL be separate from `tomas` to keep the live table small for query performance.

### Requirement: Nightly Archive Run

A nightly Supabase scheduled function SHALL run after midnight (UTC) and perform:

1. **Archive step**: Move all `tomas` rows where `scheduled_at < now() - retention_days` to `tomas_archive`, then DELETE them from `tomas`. The function SHALL use the `retention_days` applicable to each `paciente_id` (per-paciente if exists, else global default). Closed-temporada tomas are excluded from archival.
2. **Hard-delete step**: DELETE all rows from `tomas_archive` where `archived_at < now() - archive_max_age_days` (default `1095` = 36 months).

#### Scenario: Archive run moves old tomas

- GIVEN `retention_days = 730` for a paciente
- WHEN the nightly function runs on 2026-07-01
- THEN all tomas with `scheduled_at` before `2024-07-02` SHALL be moved to `tomas_archive`
- AND deleted from `tomas`

#### Scenario: Hard-delete purges ancient archive

- GIVEN `tomas_archive` contains rows with `archived_at` older than 36 months
- WHEN the nightly function runs
- THEN those rows SHALL be hard-deleted from `tomas_archive`

### Requirement: Cuidador Principal Can Update Retention Days

A `cuidador_principal` SHALL be able to update `retention_days` for their paciente. Increasing retention_days means older tomas that were previously eligible for archival become protected. Decreasing retention_days means the next archive run may archive more tomas.

#### Scenario: Retention days decreased

- GIVEN a paciente has `retention_days = 730`
- WHEN the `cuidador_principal` updates it to `365`
- THEN on the next nightly archive run, tomas older than 365 days SHALL be archived
- AND tomas between 365 and 730 days that were previously protected SHALL become eligible for archival