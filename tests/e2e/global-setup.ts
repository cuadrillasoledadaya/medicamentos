/**
 * Global setup for RLS E2E tests.
 *
 * Runs once before all RLS tests. Uses a browser page to call the Supabase
 * REST API. Creates test data as user A, then logs in as user B. Saves the
 * IDs and token B to a JSON file that the RLS tests read via test.beforeAll().
 */
import { chromium, FullConfig } from '@playwright/test';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse .env.local to get Supabase credentials
const envPath = join(dirname(dirname(__dirname)), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0 && !line.startsWith('#') && !line.startsWith(' ')) {
    const key = line.substring(0, eqIdx).trim();
    const value = line.substring(eqIdx + 1).trim();
    envVars[key] = value;
  }
}

const URL = envVars.VITE_SUPABASE_URL || 'https://cmoydmfdhssxdmwqlueg.supabase.co';
const ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY || '';
const USER_A = { email: 'e2e-test-a@medicamentos.test', password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!' };
const USER_B = { email: 'e2e-test-b@medicamentos.test', password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!' };

export default async function globalSetup(config: FullConfig) {
  const outDir = join(__dirname, '.artifacts');
  mkdirSync(outDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as user A via the REST API
    const tokenA = await page.evaluate(async ({ url, anonKey, email, password }) => {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.access_token) throw new Error(`Login failed: ${JSON.stringify(data)}`);
      return data.access_token;
    }, { url: URL, anonKey: ANON_KEY, email: USER_A.email, password: USER_A.password });

    // Decode user A's ID from the JWT (Node.js context — Buffer is available here)
    const userIdA = tokenA.split('.')[1]
      ? JSON.parse(Buffer.from(tokenA.split('.')[1], 'base64').toString()).sub
      : null;
    if (!userIdA) throw new Error('Could not extract user ID from token');

    // Create test data via REST API
    const ids = await page.evaluate(async ({ url, anonKey, token, cuidadorId }) => {
      const hdrs = (tok: string) => ({
        Authorization: `Bearer ${tok}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      });

      const post = async (table: string, body: Record<string, unknown>) => {
        const res = await fetch(`${url}/rest/v1/${table}`, {
          method: 'POST',
          headers: hdrs(token),
          body: JSON.stringify(body),
        });
        const json = await res.json();
        return Array.isArray(json) ? json[0] : json;
      };

      const ts = Date.now();
      const ids: Record<string, string> = {};

      // Decode user A's ID from the JWT so RLS pacientes_write policy passes
      const userIdA = cuidadorId;

      const paciente = await post('pacientes', { name: `[E2E-RLS] Paciente ${ts}`, timezone_id: 'America/Buenos_Aires', cuidador_id: userIdA });
      if (!paciente?.id) throw new Error(`paciente failed: ${JSON.stringify(paciente)}`);
      ids.pacientes = paciente.id;

      // Create family_members row — required for RLS on medications, schedules, etc.
      // The app's createPaciente() does this automatically, but we're using REST directly.
      // Migration 0007 adds a bootstrap policy so the paciente owner can insert this row.
      const familyMember = await post('family_members', {
        paciente_id: ids.pacientes,
        user_id: userIdA,
        role: 'cuidador_principal',
        status: 'active',
      });
      if (!familyMember?.id) throw new Error(`family_members failed: ${JSON.stringify(familyMember)}`);

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
    }, { url: URL, anonKey: ANON_KEY, token: tokenA, cuidadorId: userIdA });

    // Login as user B
    const tokenB = await page.evaluate(async ({ url, anonKey, email, password }) => {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.access_token) throw new Error(`Login failed: ${JSON.stringify(data)}`);
      return data.access_token;
    }, { url: URL, anonKey: ANON_KEY, email: USER_B.email, password: USER_B.password });

    // Write IDs and token B
    const setupFile = join(outDir, 'rls-setup.json');
    writeFileSync(setupFile, JSON.stringify({ ids, tokenB, anonKey: ANON_KEY }, null, 2));

    // Log in user B via the app UI so the browser has the session for storageState
    await page.goto('http://localhost:5173/auth/sign-in');
    await page.getByLabel('Email').fill(USER_B.email);
    await page.getByLabel('Contraseña', { exact: true }).or(page.getByLabel('Password', { exact: true })).fill(USER_B.password);
    await page.getByRole('button', { name: /Iniciar sesión|Sign in|Entrar/i }).click();
    await page.waitForURL(url => !url.pathname.includes('/auth/sign-in'), { timeout: 10000 });

    const authStateFile = join(outDir, 'rls-auth-state.json');
    await context.storageState({ path: authStateFile });
  } catch (e) {
    // If setup fails (e.g., test users don't exist), write empty state
    // so non-RLS tests can still run. RLS tests will skip if data is missing.
    console.warn(`RLS global-setup skipped: ${(e as Error).message}`);
    const setupFile = join(outDir, 'rls-setup.json');
    writeFileSync(setupFile, JSON.stringify({ ids: {}, tokenB: '', anonKey: ANON_KEY, skipped: true }, null, 2));
    // Write a minimal auth state so Playwright doesn't fail
    const authStateFile = join(outDir, 'rls-auth-state.json');
    writeFileSync(authStateFile, JSON.stringify({ cookies: [], origins: [] }, null, 2));
  } finally {
    if (browser) await browser.close();
  }
}
