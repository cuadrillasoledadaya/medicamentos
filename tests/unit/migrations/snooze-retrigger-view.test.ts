import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural test for migration 0023 — validates the SQL view extension
 * for snoozed-expired tomas.
 *
 * The migration must extend `tomas_due_for_push` with a guarded OR that
 * ensures a row is returned at most once:
 *   - Branch A: original 5-min window (snoozed_until IS NULL)
 *   - Branch B: 1-min grace around snoozed_until expiry (snoozed_until IS NOT NULL)
 *
 * Run: pnpm vitest run tests/unit/migrations/snooze-retrigger-view.test.ts
 */

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../supabase/migrations/0023_snooze_retrigger_view.sql',
);

function readMigration(): string {
  if (!existsSync(MIGRATION_PATH)) {
    throw new Error(
      `Migration file not found: ${MIGRATION_PATH}\n`
      + 'Write supabase/migrations/0023_snooze_retrigger_view.sql first.',
    );
  }
  return readFileSync(MIGRATION_PATH, 'utf-8');
}

// ---------------------------------------------------------------------------
// Scenario 1: snoozed-expired within 1-min appears
// ---------------------------------------------------------------------------

describe('snoozed-expired toma appears in view (within 1-min grace)', () => {
  it('migration contains snoozed_until IS NOT NULL branch with 1-minute grace', () => {
    const sql = readMigration();

    // Must have the IS NOT NULL guard for snoozed branch
    expect(sql).toMatch(/snoozed_until\s+is\s+not\s+null/i);

    // Must check snoozed_until <= now() (expired)
    expect(sql).toMatch(/snoozed_until\s*<=\s*now\(\)/i);

    // Must have 1-minute grace window (snoozed_until > now() - interval '1 minute')
    expect(sql).toMatch(/snoozed_until\s*>\s*now\(\)\s*-\s*interval\s+'1\s+minute'/i);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: snoozed beyond 5-min excluded
// ---------------------------------------------------------------------------

describe('snoozed toma outside grace window is excluded', () => {
  it('grace window is 1 minute (not 5 minutes) for snoozed branch', () => {
    const sql = readMigration();

    // Extract the snoozed branch: from "snoozed_until is not null" to its interval
    const snoozedBranchMatch = sql.match(
      /snoozed_until\s+is\s+not\s+null[\s\S]*?snoozed_until\s*>\s*now\(\)\s*-\s*interval\s+'([^']+)'/i,
    );
    expect(snoozedBranchMatch).not.toBeNull();
    expect(snoozedBranchMatch![1].toLowerCase()).toBe('1 minute');
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: overlap returns exactly once (mutually exclusive guards)
// ---------------------------------------------------------------------------

describe('overlap returns exactly once (mutually exclusive guards)', () => {
  it('uses snoozed_until IS NULL / IS NOT NULL for mutual exclusion', () => {
    const sql = readMigration();

    // Must have IS NULL guard for original branch
    expect(sql).toMatch(/snoozed_until\s+is\s+null/i);

    // Must have IS NOT NULL guard for snoozed branch
    expect(sql).toMatch(/snoozed_until\s+is\s+not\s+null/i);

    // These two predicates are mutually exclusive — a row can only match one
    // This ensures no double-counting in the overlap scenario
  });

  it('uses CREATE OR REPLACE VIEW (idempotent)', () => {
    const sql = readMigration();
    expect(sql).toMatch(/create\s+or\s+replace\s+view/i);
    expect(sql).toMatch(/public\.tomas_due_for_push/i);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: taken+snoozed excluded (status = 'pending' guard)
// ---------------------------------------------------------------------------

describe('taken+snoozed toma is excluded (status guard)', () => {
  it('status = pending predicate is present', () => {
    const sql = readMigration();
    expect(sql).toMatch(/t\.status\s*=\s*['"]pending['"]/i);
  });
});

// ---------------------------------------------------------------------------
// Structural validation: view columns preserved
// ---------------------------------------------------------------------------

describe('view columns preserved from original', () => {
  it('selects all required columns for push payload', () => {
    const sql = readMigration();

    const requiredColumns = [
      'toma_id',
      'paciente_id',
      'scheduled_at',
      'medication_name',
      'dose_value',
      'dose_unit',
      'paciente_name',
    ];

    for (const col of requiredColumns) {
      expect(sql).toMatch(new RegExp(col, 'i'));
    }
  });

  it('joins tomas, schedules, medications, pacientes', () => {
    const sql = readMigration();

    expect(sql).toMatch(/from\s+public\.tomas\s+t/i);
    expect(sql).toMatch(/join\s+public\.schedules\s+s/i);
    expect(sql).toMatch(/join\s+public\.medications\s+m/i);
    expect(sql).toMatch(/join\s+public\.pacientes\s+p/i);
  });
});

// ---------------------------------------------------------------------------
// Original 5-min window preserved
// ---------------------------------------------------------------------------

describe('original 5-min window preserved for non-snoozed tomas', () => {
  it('original branch uses 5-minute window', () => {
    const sql = readMigration();

    // Must have scheduled_at <= now()
    expect(sql).toMatch(/scheduled_at\s*<=\s*now\(\)/i);

    // Must have scheduled_at > now() - interval '5 minutes'
    expect(sql).toMatch(/scheduled_at\s*>\s*now\(\)\s*-\s*interval\s+'5\s+minutes'/i);
  });
});
