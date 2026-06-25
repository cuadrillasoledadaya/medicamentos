# Medication Domain Specification

## Purpose

Defines the `medications` table, CRUD semantics, photo upload, and dose-unit validation for the medication tracker PWA.

---

## Requirements

### Requirement: Medication Entity

The system SHALL persist a `medications` table with the following columns:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `paciente_id` | `uuid` | FK to `pacientes.id`, NOT NULL |
| `name` | `text` | NOT NULL |
| `dose_value` | `numeric` | NOT NULL |
| `dose_unit` | `text` | NOT NULL, MUST match a value in the dose-units seed list or be `"other"` |
| `dose_unit_other` | `text` | NULL, used when `dose_unit = 'other'` |
| `route` | `text` | NOT NULL |
| `frequency_hint` | `text` | NULL |
| `notes` | `text` | NULL |
| `photo_url` | `text` | NULL |
| `stock_estimate` | `integer` | NOT NULL, default `0`, MUST be >= 0 |
| `low_stock_threshold` | `integer` | NOT NULL, default `7`, MUST be >= 0 |
| `active` | `boolean` | NOT NULL, default `true` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

#### Scenario: Create medication

- GIVEN the authenticated user is a `cuidador_principal` for the target `paciente`
- WHEN the user submits a valid medication payload with `name`, `dose_value`, `dose_unit`, `route`
- THEN the system SHALL create a row in `medications` with `paciente_id` set to the target patient and `active` set to `true`

#### Scenario: Dose-unit validation

- GIVEN a medication creation or update payload with `dose_unit`
- WHEN `dose_unit` is NOT in the canonical dose-units list AND NOT `"other"`
- THEN the system SHALL reject the request with HTTP 400 and an error indicating the invalid unit

#### Scenario: Photo upload

- GIVEN a `cuidador_principal` uploads a photo for a medication
- WHEN the upload succeeds and returns a Supabase Storage URL
- THEN the system SHALL store that URL in `medications.photo_url`

#### Scenario: Deactivate medication

- GIVEN a `cuidador_principal` marks a medication as inactive
- WHEN the update sets `active = false`
- THEN the system SHALL retain the row in `medications` and future schedules referencing it SHALL behave as if it has no active schedules

### Requirement: Stock Estimate

The system SHALL decrement `stock_estimate` by 1 whenever a `taken` intake event is recorded for the medication. The system SHALL generate an in-app alert when `stock_estimate <= low_stock_threshold`.

#### Scenario: Stock decrements on toma

- GIVEN a medication with `stock_estimate = 10`
- WHEN a `taken` intake event is recorded for that medication
- THEN `stock_estimate` SHALL be `9` after the event

#### Scenario: Low-stock alert

- GIVEN a medication with `stock_estimate = 3` and `low_stock_threshold = 7`
- WHEN any toma event is recorded or the stock is viewed
- THEN the system SHALL surface an in-app alert visible on the caregiver dashboard

### Requirement: Manual Stock Adjustment

A `cuidador_principal` SHALL be able to adjust `stock_estimate` manually, providing a free-text `reason` for the adjustment. The adjustment event SHALL be logged but does not create a `tomas` row.

#### Scenario: Manual stock adjust with reason

- GIVEN a medication with `stock_estimate = 5`
- WHEN a `cuidador_principal` updates `stock_estimate` to `20` with reason `"stock replenished"`
- THEN `stock_estimate` SHALL be `20` and the system SHALL retain the reason for audit purposes
