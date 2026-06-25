# Family / RLS Domain Specification

## Purpose

Defines family membership, roles, permissions, and the RLS policy contract that sdd-apply translates into actual Postgres RLS policies.

---

## Requirements

### Requirement: Paciente Entity

The system SHALL persist a `pacientes` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `cuidador_id` | `uuid` | FK to `auth.users.id`, NOT NULL — the primary registering cuidador |
| `name` | `text` | NOT NULL |
| `dob` | `date` | NULL |
| `photo_url` | `text` | NULL |
| `timezone_id` | `text` | NOT NULL, default `'America/Buenos_Aires'` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### Requirement: Family Membership Entity

The system SHALL persist a `family_members` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `user_id` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `role` | `text` | NOT NULL — one of `owner_paciente`, `cuidador_principal`, `cuidador_secundario`, `medico` |
| `status` | `text` | NOT NULL, default `'pending'` — `pending`, `active`, `revoked` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

A user SHALL be able to be associated with multiple `pacientes` (multi-paciente support for medical-professional cuidadores).

### Requirement: Role Permissions

The system SHALL enforce the following permission matrix via Supabase RLS:

| Role | Read own/scheduled | Register toma | Edit medication | Edit schedule | Edit family | Admin UI |
|------|---------------------|---------------|----------------|---------------|-------------|----------|
| `owner_paciente` | Yes | Yes | No | No | No | No |
| `cuidador_principal` | Yes | Yes | Yes | Yes | Yes | Yes |
| `cuidador_secundario` | Yes | Yes | No | No | No | No |
| `medico` | Yes (read-only) | No | No | No | No | No |

#### Scenario: Cuidador secundario cannot edit medication

- GIVEN a user with role `cuidador_secundario` on a paciente
- WHEN the user attempts to INSERT or UPDATE a `medications` row for that paciente
- THEN the RLS policy SHALL deny the write and return a 403

#### Scenario: Medico read-only access

- GIVEN a user with role `medico` on a paciente
- WHEN the user SELECTs from `medications`, `schedules`, `tomas`
- THEN access SHALL be granted
- WHEN the user attempts any INSERT, UPDATE, or DELETE on those tables
- THEN the RLS policy SHALL deny the write

### Requirement: RLS Policy Intent

For sdd-apply to translate into SQL:

1. All tables (`pacientes`, `medications`, `schedules`, `tomas`, `family_members`) SHALL have RLS enabled.
2. Read policies: a user can read rows belonging to any `paciente` where they have an active `family_members` entry.
3. Write policies: only `cuidador_principal` can INSERT/UPDATE/DELETE medications, schedules, and plans. All active family members can INSERT `tomas`. Only `registered_by` or `cuidador_principal` can UPDATE a `tomas` row.
4. `owner_paciente` can UPDATE their own `tomas` rows only.
5. The `auth.uid()` function SHALL be used to reference the current user.
