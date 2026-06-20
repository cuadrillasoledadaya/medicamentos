/**
 * RLS Contract Test — CRITICAL security boundary validation.
 *
 * Signs in as user A, creates test data across ALL tables, then signs in as
 * user B and verifies that every cross-user SELECT returns empty and every
 * INSERT/UPDATE/DELETE is rejected.
 *
 * Approach: Uses Supabase REST API from page.evaluate() with the user's session
 * token. This exercises the same auth pipeline the app uses.
 *
 * Test users (created in Supabase Auth Dashboard):
 *   e2e-test-a@medicamentos.test — creates data (owner)
 *   e2e-test-b@medicamentos.test — attempts cross-user access (must fail)
 *
 * NOTE: interactions table allows any authenticated user to read (v1 design).
 * Excluded from cross-user isolation check.
 *
 * Setup: Data creation runs in global-setup.ts once before all tests.
 * The IDs and token B are read from tests/e2e/.artifacts/rls-setup.json.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const URL = process.env.VITE_SUPABASE_URL || 'https://cmoydmfdhssxdmwqlueg.supabase.co';
const SETUP_FILE = join(__dirname, '.artifacts', 'rls-setup.json');

// Tables to test for cross-user RLS isolation
const RLS_TABLES = [
  { table: 'pacientes', col: 'cuidador_id', writes: true },
  { table: 'family_members', col: 'paciente_id', writes: true },
  { table: 'temporadas', col: 'paciente_id', writes: true },
  { table: 'plans', col: 'paciente_id', writes: true },
  { table: 'medications', col: 'paciente_id', writes: true },
  { table: 'schedules', col: 'medication_id', writes: true },
  { table: 'tomas', col: 'paciente_id', writes: true },
  { table: 'tomas_archive', col: 'paciente_id', writes: false },
  { table: 'vacations', col: 'paciente_id', writes: true },
  { table: 'retention_policies', col: 'paciente_id', writes: true },
  { table: 'notification_settings', col: 'paciente_id', writes: true },
  { table: 'stock_adjustments', col: 'medication_id', writes: true },
  { table: 'adherence_daily', col: 'paciente_id', writes: false },
  { table: 'temporada_reopen_audit', col: 'temporada_id', writes: true },
  { table: 'patient_trip_adjustments', col: 'paciente_id', writes: true },
] as const;

let ids: Record<string, string> = {};
let tokenB = '';
let anonKey = '';
let setupSkipped = false;

test.beforeAll(() => {
  try {
    const state = JSON.parse(readFileSync(SETUP_FILE, 'utf-8'));
    setupSkipped = state.skipped || false;
    if (setupSkipped) {
      console.warn('RLS tests skipped: global-setup could not create test data (test users may not exist)');
      return;
    }
    ids = state.ids;
    tokenB = state.tokenB;
    anonKey = state.anonKey || '';
  } catch {
    setupSkipped = true;
    console.warn('RLS tests skipped: setup file not found. Run global-setup first.');
  }
});

test.describe('RLS Cross-User Isolation', () => {
  test.use({
    storageState: join(__dirname, '.artifacts', 'rls-auth-state.json'),
  });

  test.beforeEach(async ({ page }) => {
    test.skip(setupSkipped, 'RLS setup skipped — test users may not exist in Supabase');
    // Navigate to the app and inject the anon key
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((key) => { (window as any).__E2E_ANON_KEY = key; }, anonKey);
  });

  test('SELECT returns empty for all tables owned by user A', async ({ page }) => {
    for (const { table } of RLS_TABLES) {
      const id = ids[table];
      if (!id) continue;
      const result = await restCall(page, tokenB, 'GET', table, id);
      expect((result as any).data || [], `${table}: user B should not see user A's row`).toEqual([]);
    }
  });

  test('UPDATE is rejected for writable tables owned by user A', async ({ page }) => {
    for (const { table, writes } of RLS_TABLES) {
      if (!writes) continue;
      const id = ids[table];
      if (!id) continue;
      const result = await restCall(page, tokenB, 'PATCH', table, id, { notes: '[E2E-RLS] hacked' });
      expect((result as any).error, `${table}: user B should not UPDATE user A's row`).toBeDefined();
    }
  });

  test('DELETE is rejected for writable tables owned by user A', async ({ page }) => {
    for (const { table, writes } of RLS_TABLES) {
      if (!writes) continue;
      const id = ids[table];
      if (!id) continue;
      const result = await restCall(page, tokenB, 'DELETE', table, id);
      expect((result as any).error, `${table}: user B should not DELETE user A's row`).toBeDefined();
    }
  });

  test('INSERT is rejected for patient-scoped tables', async ({ page }) => {
    const pid = ids.pacientes;
    if (!pid) throw new Error('No paciente created');

    const insertable = RLS_TABLES.filter(t => t.writes && t.col === 'paciente_id' && !['pacientes', 'family_members', 'temporada_reopen_audit'].includes(t.table));

    for (const { table } of insertable) {
      const body: Record<string, unknown> = { paciente_id: pid };
      if (table === 'temporadas') Object.assign(body, { name: '[E2E-RLS] Intruder', start_date: '2026-01-01', end_date: '2026-12-31' });
      if (table === 'plans') Object.assign(body, { is_permanent: true });
      if (table === 'vacations') Object.assign(body, { starts_at: '2026-09-01T00:00:00Z', ends_at: '2026-09-07T00:00:00Z' });
      if (table === 'retention_policies') Object.assign(body, { retention_days: 365 });
      if (table === 'notification_settings') Object.assign(body, { channel: 'in_app', enabled: true });
      if (table === 'patient_trip_adjustments') Object.assign(body, { starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-10T00:00:00Z', shift_hours: 2 });

      const result = await page.evaluate(async ({ url, token, table, body }) => {
        const res = await fetch(`${url}/rest/v1/${table}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, apikey: (window as any).__E2E_ANON_KEY || '', 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify(body),
        });
        if (!res.ok) return { error: { status: res.status } };
        return { data: await res.json() };
      }, { url: URL, token: tokenB, table, body });

      expect((result as any).error, `${table}: user B should not INSERT into user A's paciente`).toBeDefined();
    }
  });
});

async function restCall(page: ReturnType<typeof test.extend>, token: string, method: string, table: string, id: string, body?: Record<string, unknown>) {
  return page.evaluate(async ({ url, token, method, table, id, body }) => {
    const h: Record<string, string> = { Authorization: `Bearer ${token}`, apikey: (window as any).__E2E_ANON_KEY || '', 'Content-Type': 'application/json' };
    if (method !== 'GET') h.Prefer = 'return=representation';
    const opts: RequestInit = { method, headers: h };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, opts);
    if (!res.ok) return { error: { status: res.status } };
    return { data: method !== 'DELETE' ? await res.json() : null };
  }, { url: URL, token, method, table, id, body });
}
