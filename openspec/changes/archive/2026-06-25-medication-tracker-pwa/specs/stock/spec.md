# Stock Tracking Domain Specification

## Purpose

Defines stock estimation, low-stock threshold alerts, decrement-on-toma semantics, and manual adjustment with audit reason.

---

## Requirements

### Requirement: Stock Decrement on Toma

On every `taken` intake event, the system SHALL decrement `medications.stock_estimate` by 1. This SHALL happen atomically with the toma insert/update in the same database transaction.

#### Scenario: Stock decrements atomically with toma

- GIVEN a medication with `stock_estimate = 10`
- WHEN a user marks a toma as `taken`
- THEN the database SHALL decrement `stock_estimate` to `9` in the same transaction that inserts the toma row
- AND if the transaction rolls back, the stock SHALL NOT change

### Requirement: Low-Stock Alert

When `stock_estimate <= low_stock_threshold` for any active medication, the system SHALL generate an in-app alert visible on the caregiver dashboard. This check SHALL run on every stock-decrement event and on every dashboard load.

#### Scenario: Low-stock alert visible on dashboard

- GIVEN a medication has `stock_estimate = 3` and `low_stock_threshold = 7`
- WHEN the caregiver opens the dashboard
- THEN an alert SHALL be displayed indicating the medication is low on stock
- AND the alert SHALL show the remaining count and the threshold

### Requirement: Manual Adjustment with Reason

A `cuidador_principal` SHALL be able to set `stock_estimate` to any non-negative integer and MUST provide a free-text `reason`. The reason SHALL be stored in a `stock_adjustments` audit table.

The `stock_adjustments` table:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `medication_id` | `uuid` | FK to `medications.id`, NOT NULL |
| `previous_estimate` | `integer` | NOT NULL |
| `new_estimate` | `integer` | NOT NULL |
| `reason` | `text` | NOT NULL |
| `adjusted_by` | `uuid` | FK to `auth.users.id`, NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

#### Scenario: Manual stock adjustment with reason

- GIVEN a medication has `stock_estimate = 5`
- WHEN a `cuidador_principal` updates `stock_estimate` to `30` with reason `"new prescription received"`
- THEN a row SHALL be inserted in `stock_adjustments` with `previous_estimate = 5`, `new_estimate = 30`
- AND `stock_estimate` on the medication SHALL be `30`
