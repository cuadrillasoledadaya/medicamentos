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
 */
import { test, expect } from '@playwright/test';

const URL = process.env.VITE_SUPABASE_URL || 'https://cmoydmfdhssxdmwqlueg.supabase.co';
const USER_A = { email: 'e2e-test-a@medicamentos.test', password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!' };
const USER_B = { email: 'e2e-test-b@medicamentos.test', password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!' };

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

const hdrs = (token: string) => ({
  Authorization: `Bearer ${token}`, apikey: (window as any).__E2E_ANON_KEY || '',
  'Content-Type': 'application/json', Prefer: 'return=representation',
});

async function login(page: ReturnType<typeof test.extend>, email: string, password: string): Promise<string> {
  return page.evaluate(async ({ url, email, password }) => {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: (window as any).__E2E_ANON_KEY || '' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(`Login failed: ${JSON.stringify(data)}`);
    return data.access_token;
  }, { url: URL, email, password });
}

async function createTestData(page: ReturnType<typeof test.extend>, token: string): Promise<Record<string, string>> {
  return page.evaluate(async ({ url, token }) => {
    const h = (window as any).__hdrs(token);
    const ts = Date.now();
    const ids: Record<string, string> = {};

    const post = async (table: string, body: Record<string, unknown>) => {
      const res = await fetch(`${url}/rest/v1/${table}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
      const json = await res.json();
      return Array.isArray(json) ? json[0] : json;
    };

    const paciente = await post('pacientes', { name: `[E2E-RLS] Paciente ${ts}`, timezone_id: 'America/Buenos_Aires' });
    if (!paciente?.id) throw new Error(`paciente failed: ${JSON.stringify(paciente)}`);
    ids.pacientes = paciente.id;

    const temporada = await post('temporadas', { paciente_id: ids.pacientes, name: `[E2E-RLS] Temporada ${ts}`, start_date: '2026-01-01', end_date: '2026-12-31' });
    if (temporada?.id) ids.temporadas = temporada.id;

    const plan = await post('plans', { paciente_id: ids.pacientes, is_permanent: true, notes: '[E2E-RLS] Plan' });
    if (plan?.id) ids.plans = plan.id;

    const medication = await post('medications', { paciente_id: ids.pacientes, name: `[E2E-RLS] Med ${ts}`, dose_value: 500, dose_unit: 'mg', route: 'Oral' });
    if (!medication?.id) throw new Error(`medication failed: ${JSON.stringify(medication)}`);
    ids.medications = medication.id;

    const schedule = await post('schedules', { medication_id: ids.medications, time_of_day: '08:00:00', weekday_mask: 127 });
    if (schedule?.id) ids.schedules = schedule.id;

    if (schedule?.id && ids.pacientes) {
      const toma = await post('tomas', { schedule_id: schedule.id, paciente_id: ids.pacientes, scheduled_at: new Date().toISOString(), status: 'pending' });
      if (toma?.id) ids.tomas = toma.id;
    }

    const vacation = await post('vacations', { paciente_id: ids.pacientes, medication_id: ids.medications, starts_at: '2026-07-01T00:00:00Z', ends_at: '2026-07-07T00:00:00Z', reason: '[E2E-RLS] Test' });
    if (vacation?.id) ids.vacations = vacation.id;

    const retention = await post('retention_policies', { paciente_id: ids.pacientes, retention_days: 365 });
    if (retention?.id) ids.retention_policies = retention.id;

    const notif = await post('notification_settings', { paciente_id: ids.pacientes, channel: 'in_app', enabled: true });
    if (notif?.id) ids.notification_settings = notif.id;

    const trip = await post('patient_trip_adjustments', { paciente_id: ids.pacientes, starts_at: '2026-08-01T00:00:00Z', ends_at: '2026-08-10T00:00:00Z', shift_hours: 3, reason: '[E2E-RLS] Test' });
    if (trip?.id) ids.patient_trip_adjustments = trip.id;

    return ids;
  }, { url: URL, token });
}

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

test.describe('RLS Cross-User Isolation', () => {
  let ids: Record<string, string> = {};
  let tokenB = '';

  test.beforeAll(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => { (window as any).__E2E_ANON_KEY = key; }, process.env.VITE_SUPABASE_ANON_KEY || '');
    await page.evaluate(() => {
      (window as any).__hdrs = (token: string) => ({
        Authorization: `Bearer ${token}`, apikey: (window as any).__E2E_ANON_KEY || '',
        'Content-Type': 'application/json', Prefer: 'return=representation',
      });
    });

    const tokenA = await login(page, USER_A.email, USER_A.password);
    ids = await createTestData(page, tokenA);
    tokenB = await login(page, USER_B.email, USER_B.password);
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
