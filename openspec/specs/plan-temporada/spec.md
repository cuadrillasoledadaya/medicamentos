# Plan / Temporada Domain Specification

## Purpose

Defines the `temporadas` (named treatment periods) and `plans` entities. A Plan is either PERMANENT (no temporada) or SEASONAL (belongs to a Temporada). Closing a Temporada freezes its Plans and Tomas into history.

---

## Requirements

### Requirement: Temporada Entity

The system SHALL persist a `temporadas` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `name` | `text` | NOT NULL |
| `start_date` | `date` | NOT NULL |
| `end_date` | `date` | NOT NULL |
| `closed_at` | `timestamptz` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

A `temporada` is in one of two states: **OPEN** (`closed_at IS NULL`) or **CLOSED** (`closed_at IS NOT NULL`).

#### Scenario: Create temporada

- GIVEN a `cuidador_principal` creates a new Temporada for a paciente
- WHEN the `temporada` has a `name`, `start_date`, and `end_date`
- THEN the system SHALL create the row with `closed_at = NULL`

#### Scenario: Close temporada

- GIVEN an OPEN `temporada`
- WHEN a `cuidador_principal` closes it
- THEN the system SHALL set `closed_at` to the current `timestamptz` and all associated Plans and Tomas SHALL become immutable

### Requirement: Plan Entity

The system SHALL persist a `plans` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `temporada_id` | `uuid` | FK to `temporadas.id`, NULL |
| `is_permanent` | `boolean` | NOT NULL, default `false` |
| `notes` | `text` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

- `is_permanent = true` SHALL mean the Plan has no `temporada_id` (SEASONAL Plan has `is_permanent = false` and a `temporada_id`).
- The system SHALL enforce that `is_permanent = true` implies `temporada_id IS NULL`.

#### Scenario: Create permanent plan

- GIVEN a paciente without a permanent plan
- WHEN a `cuidador_principal` creates a Plan with `is_permanent = true`
- THEN `temporada_id` SHALL be NULL and `is_permanent` SHALL be `true`

#### Scenario: Create seasonal plan

- GIVEN an open `temporada` exists for the paciente
- WHEN a `cuidador_principal` creates a Plan with `is_permanent = false` and a `temporada_id`
- THEN the system SHALL link the Plan to that Temporada

### Requirement: Current Patient Context

The system SHALL compute a patient's "current context" as the union of all PERMANENT plans plus all plans belonging to the currently OPEN temporada (if any). A paciente has at most one OPEN temporada at any time.

#### Scenario: Current context excludes closed temporada

- GIVEN a paciente has a CLOSED temporada "Invierno 2026" and an OPEN temporada "Primavera 2026"
- WHEN the system resolves the current context
- THEN plans from "Invierno 2026" SHALL be excluded and plans from "Primavera 2026" SHALL be included
