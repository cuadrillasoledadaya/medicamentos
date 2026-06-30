import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

/**
 * Integration test for migration 0023 — validates the SQL view extension
 * for snoozed-expired tomas using a real in-process Postgres (pglite).
 *
 * The migration extends `tomas_due_for_push` with a guarded OR that
 * ensures a row is returned at most once:
 *   - Branch A: original 5-min window (snoozed_until IS NULL)
 *   - Branch B: 1-min grace around snoozed_until expiry (snoozed_until IS NOT NULL)
 *
 * Run: pnpm vitest run tests/unit/migrations/snooze-retrigger-view.test.ts
 */

// Minimal schema needed for the view (subset of 0001_initial_schema.sql)
const MINIMAL_SCHEMA = `
create type intake_status as enum ('pending','taken_on_time','taken_late','skipped','missed');

create table pacientes (
  id uuid primary key default gen_random_uuid(),
  cuidador_id uuid not null,
  name text not null,
  timezone_id text not null default 'America/Buenos_Aires',
  created_at timestamptz not null default now()
);

create table medications (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null,
  name text not null,
  dose_value numeric not null check (dose_value > 0),
  dose_unit text not null,
  route text not null,
  stock_estimate integer not null default 0,
  low_stock_threshold integer not null default 7,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null,
  time_of_day time not null,
  weekday_mask integer not null check (weekday_mask between 0 and 127),
  timezone_id text not null default 'America/Buenos_Aires',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tomas (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null,
  paciente_id uuid not null,
  scheduled_at timestamptz not null,
  status intake_status not null default 'pending',
  taken_at timestamptz,
  snoozed_until timestamptz,
  skip_reason text,
  registered_by uuid not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
`;

// The original view (0014) — baseline before migration 0023
const ORIGINAL_VIEW = `
create or replace view public.tomas_due_for_push as
select
  t.id as toma_id,
  t.paciente_id,
  t.scheduled_at,
  m.name as medication_name,
  m.dose_value,
  m.dose_unit,
  p.name as paciente_name
from public.tomas t
join public.schedules s on s.id = t.schedule_id
join public.medications m on m.id = s.medication_id
join public.pacientes p on p.id = t.paciente_id
where t.status = 'pending'
  and t.scheduled_at <= now()
  and t.scheduled_at > now() - interval '5 minutes';
`;

// Read the migration SQL
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

let db: PGlite;

async function createDb(applyMigration = true): Promise<PGlite> {
  const newDb = await PGlite.create();
  await newDb.exec(MINIMAL_SCHEMA);
  await newDb.exec(ORIGINAL_VIEW);
  if (applyMigration) {
    const migration = readMigration();
    await newDb.exec(migration);
  }
  return newDb;
}

// Helper: insert a fixture toma and return its ID
async function insertToma(
  pg: PGlite,
  opts: {
    status?: string;
    scheduledAtSql?: string;  // raw SQL expression for scheduled_at
    snoozedUntilSql?: string | null; // raw SQL expression or NULL
    pacienteName?: string;
    medicationName?: string;
    doseValue?: number;
    doseUnit?: string;
  } = {},
): Promise<string> {
  const {
    status = 'pending',
    scheduledAtSql = "now() - interval '2 minutes'",
    snoozedUntilSql = null,
    pacienteName = 'Test Paciente',
    medicationName = 'Losartán',
    doseValue = 50,
    doseUnit = 'mg',
  } = opts;

  // Insert paciente
  const pacRes = await pg.query(
    "INSERT INTO pacientes (cuidador_id, name) VALUES (gen_random_uuid(), $1) RETURNING id",
    [pacienteName],
  );
  const pacienteId = (pacRes.rows[0] as any).id;

  // Insert medication
  const medRes = await pg.query(
    "INSERT INTO medications (paciente_id, name, dose_value, dose_unit, route) VALUES ($1, $2, $3, $4, 'oral') RETURNING id",
    [pacienteId, medicationName, doseValue, doseUnit],
  );
  const medicationId = (medRes.rows[0] as any).id;

  // Insert schedule
  const schedRes = await pg.query(
    "INSERT INTO schedules (medication_id, time_of_day, weekday_mask) VALUES ($1, '08:00', 127) RETURNING id",
    [medicationId],
  );
  const scheduleId = (schedRes.rows[0] as any).id;

  // Insert toma — use raw SQL for time expressions
  const snoozedExpr = snoozedUntilSql === null ? 'NULL' : snoozedUntilSql;
  const tomaRes = await pg.query(
    `INSERT INTO tomas (schedule_id, paciente_id, scheduled_at, status, snoozed_until, registered_by)
     VALUES ($1, $2, ${scheduledAtSql}, $3, ${snoozedExpr}, gen_random_uuid()) RETURNING id`,
    [scheduleId, pacienteId, status],
  );
  return (tomaRes.rows[0] as any).id;
}

// ---------------------------------------------------------------------------
// Scenario 1: snoozed-expired within 1-min appears
// ---------------------------------------------------------------------------

describe('snoozed-expired toma appears in view (within 1-min grace)', () => {
  beforeAll(async () => { db = await createDb(true); });
  afterAll(async () => { await db.close(); });

  it('returns a snoozed toma whose snoozed_until expired within the last minute', async () => {
    const tomaId = await insertToma(db, {
      scheduledAtSql: "'2020-01-01T00:00:00Z'",
      snoozedUntilSql: "now() - interval '30 seconds'",
    });

    const rows = await db.query(
      'SELECT toma_id FROM public.tomas_due_for_push WHERE toma_id = $1',
      [tomaId],
    );
    expect(rows.rows.length).toBe(1);
    expect((rows.rows[0] as any).toma_id).toBe(tomaId);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: snoozed beyond grace excluded
// ---------------------------------------------------------------------------

describe('snoozed toma outside grace window is excluded', () => {
  beforeAll(async () => { db = await createDb(true); });
  afterAll(async () => { await db.close(); });

  it('excludes a snoozed toma whose snoozed_until expired > 1 minute ago', async () => {
    const tomaId = await insertToma(db, {
      scheduledAtSql: "'2020-01-01T00:00:00Z'",
      snoozedUntilSql: "now() - interval '2 minutes'",
    });

    const rows = await db.query(
      'SELECT toma_id FROM public.tomas_due_for_push WHERE toma_id = $1',
      [tomaId],
    );
    expect(rows.rows.length).toBe(0);
  });

  it('excludes a snoozed toma whose snoozed_until is in the future', async () => {
    const tomaId = await insertToma(db, {
      scheduledAtSql: "'2020-01-01T00:00:00Z'",
      snoozedUntilSql: "now() + interval '5 minutes'",
    });

    const rows = await db.query(
      'SELECT toma_id FROM public.tomas_due_for_push WHERE toma_id = $1',
      [tomaId],
    );
    expect(rows.rows.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: overlap returns exactly once (mutually exclusive guards)
// ---------------------------------------------------------------------------

describe('overlap returns exactly once (mutually exclusive guards)', () => {
  beforeAll(async () => { db = await createDb(true); });
  afterAll(async () => { await db.close(); });

  it('a non-snoozed toma within 5-min window appears exactly once', async () => {
    const tomaId = await insertToma(db, {
      scheduledAtSql: "now() - interval '2 minutes'",
      snoozedUntilSql: null,
    });

    const rows = await db.query(
      'SELECT toma_id FROM public.tomas_due_for_push WHERE toma_id = $1',
      [tomaId],
    );
    expect(rows.rows.length).toBe(1);
  });

  it('a toma cannot match both branches simultaneously', async () => {
    // snoozed_until IS NULL and IS NOT NULL are mutually exclusive by definition
    // Verify by checking the migrated view definition
    const def = await db.query(
      "SELECT pg_get_viewdef('public.tomas_due_for_push', true)",
    );
    const viewDef = (def.rows[0] as any).pg_get_viewdef;
    expect(viewDef).toMatch(/snoozed_until\s+IS\s+NULL/i);
    expect(viewDef).toMatch(/snoozed_until\s+IS\s+NOT\s+NULL/i);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: taken+snoozed excluded (status = 'pending' guard)
// ---------------------------------------------------------------------------

describe('taken+snoozed toma is excluded (status guard)', () => {
  beforeAll(async () => { db = await createDb(true); });
  afterAll(async () => { await db.close(); });

  it('excludes a taken toma even if snoozed_until is set', async () => {
    const tomaId = await insertToma(db, {
      status: 'taken_on_time',
      scheduledAtSql: "now() - interval '2 minutes'",
      snoozedUntilSql: "now() - interval '30 seconds'",
    });

    const rows = await db.query(
      'SELECT toma_id FROM public.tomas_due_for_push WHERE toma_id = $1',
      [tomaId],
    );
    expect(rows.rows.length).toBe(0);
  });

  it('excludes a skipped toma', async () => {
    const tomaId = await insertToma(db, {
      status: 'skipped',
      scheduledAtSql: "now() - interval '2 minutes'",
      snoozedUntilSql: null,
    });

    const rows = await db.query(
      'SELECT toma_id FROM public.tomas_due_for_push WHERE toma_id = $1',
      [tomaId],
    );
    expect(rows.rows.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Structural validation: migration SQL content
// ---------------------------------------------------------------------------

describe('migration SQL structure', () => {
  it('uses CREATE OR REPLACE VIEW (idempotent)', () => {
    const sql = readMigration();
    expect(sql).toMatch(/create\s+or\s+replace\s+view/i);
    expect(sql).toMatch(/public\.tomas_due_for_push/i);
  });

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
