# Adherence Domain Specification

## Purpose

Defines adherence computation: a rolling 4-week window, the quality-window definition, the formula, and the requirement that chart data be derivable from the `tomas` table without precomputed metrics.

---

## Requirements

### Requirement: Adherence Formula

The system SHALL compute adherence as:

```
adherence = taken_on_time / (taken_on_time + taken_late + missed + skipped_in_quality_window)
```

The rolling window SHALL be exactly the preceding 28 days from the current date (UTC).

### Requirement: Quality Window

A toma is included in the adherence denominator if it is scheduled within the 28-day window AND NOT explicitly skipped outside of a planned vacation period. Skips that occur during an active vacation pause SHALL be excluded from both numerator and denominator.

#### Scenario: Tome counts in adherence

- GIVEN 20 tomas in the 28-day window: 14 `taken_on_time`, 2 `taken_late`, 1 `missed`, 3 `skipped` (not during vacation)
- WHEN adherence is computed
- THEN the result SHALL be `14 / (14 + 2 + 1 + 3) = 14/20 = 70%`

#### Scenario: Vacation skip excluded

- GIVEN a paciente has a 5-day GLOBAL vacation pause with 5 tomas skipped
- WHEN adherence is computed for the 28-day window that includes those 5 days
- THEN those 5 skips SHALL be excluded from the denominator

### Requirement: No Precomputed Metrics

The system SHALL NOT store precomputed adherence percentages. All adherence metrics SHALL be derived from the `tomas` table at query time (or via a daily-rollup table populated by a database function, which sdd-apply MAY implement).

The daily-rollup table (if used) SHALL be named `adherence_daily` with columns: `paciente_id`, `date`, `taken_on_time`, `taken_late`, `missed`, `skipped`, `rollup_computed_at`. This table SHALL be updated by a nightly Supabase scheduled function.

#### Scenario: Dashboard adherence chart

- GIVEN a dashboard request for a paciente's adherence chart
- WHEN the query is executed
- THEN the system SHALL aggregate `tomas` rows (or read from `adherence_daily`) for the trailing 28 days per day/week and return a time-series of daily adherence percentages
- AND the chart data SHALL be derivable without external computation
