# Drug Interaction Domain Specification

## Purpose

Defines the `interactions` table for curated drug-drug conflict pairs, severity levels, alert triggers on medication add and on schedule creation, and temporal conflict detection.

---

## Requirements

### Requirement: Interaction Entity

The system SHALL persist an `interactions` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `drug_a` | `text` | NOT NULL — normalized medication name |
| `drug_b` | `text` | NOT NULL — normalized medication name |
| `severity` | `text` | NOT NULL — enum: `info`, `caution`, `warning`, `severe` |
| `description` | `text` | NOT NULL |
| `source_notes` | `text` | NULL — e.g., "ANMAT 2024", "FDA label" |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

The pair `(drug_a, drug_b)` SHALL be unique with canonical ordering (alphabetically lower first).

### Requirement: Interaction Alert on Medication Add

When a new medication is added, the system SHALL scan all existing ACTIVE medications for the same `paciente_id` for known interaction pairs and surface a warning to the `cuidador_principal`.

#### Scenario: Interaction warning on add

- GIVEN a paciente has active medication "Warfarina"
- WHEN a cuidador adds a new medication "Aspirina"
- THEN the system SHALL query the `interactions` table for any pair matching ("Aspirina", "Warfarina")
- AND if found, surface a warning with the `severity` and `description`

### Requirement: Temporal Conflict Alert

When a new schedule is created or modified, the system SHALL detect if any two active medications for the same `paciente` would be scheduled within 5 minutes of each other and have `severity >= caution`. If found, a warning SHALL be displayed.

#### Scenario: Temporal conflict

- GIVEN two active medications "Metformin" (08:00 daily) and "Enalapril" (08:03 daily) for the same paciente
- WHEN the second schedule is saved
- THEN if the interaction severity between these two drugs is `caution` or higher
- THEN a temporal conflict warning SHALL be shown

### Requirement: Admin Curation UI

The owner (`cuidador_principal` with owner-level rights) SHALL have an admin UI to ADD, EDIT, and DELETE interaction pairs. No API integration exists in v1; all pairs are curated manually in-app.

#### Scenario: Owner adds interaction pair

- GIVEN an owner accesses the admin interaction UI
- WHEN they submit a new pair with `drug_a`, `drug_b`, `severity`, and `description`
- THEN the system SHALL insert the row with canonical ordering
- AND the pair SHALL immediately affect new medication/schedule warnings
