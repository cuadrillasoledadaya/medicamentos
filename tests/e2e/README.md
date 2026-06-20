# E2E Tests — Medicamentos PWA

## Test Files

| File | Purpose |
|------|---------|
| `auth.spec.ts` | Sign-in, sign-out, ProtectedRoute redirect, session persistence |
| `pacientes.spec.ts` | Paciente CRUD + multi-paciente selector |
| `medications.spec.ts` | Medication CRUD + photo upload + interactions alert |
| `tomas.spec.ts` | Toma lifecycle: view, mark taken, snooze, skip, history |
| `offline.spec.ts` | Offline outbox queue → reconnect → sync to Supabase |
| `rls.spec.ts` | **CRITICAL**: Cross-user RLS isolation for all 15+ tables |

## Setup

### 1. Install Playwright browsers

```bash
pnpm exec playwright install chromium
```

### 2. Create test users in Supabase Auth Dashboard

URL: https://supabase.com/dashboard/project/cmoydmfdhssxdmwqlueg/auth/users

Create two users with **"Auto Confirm User"** checked:

| Email | Password | Purpose |
|-------|----------|---------|
| `e2e-test-a@medicamentos.test` | `TestPassword123!` | User A — owns test data |
| `e2e-test-b@medicamentos.test` | `TestPassword123!` | User B — RLS isolation target |

Steps: "Add user" → "Create new user" → enter email + password → check "Auto Confirm User" → "Create user".

### 3. Environment

Tests use `.env.local` (same as the app). Ensure it has:
```
VITE_SUPABASE_URL=https://cmoydmfdhssxdmwqlueg.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Optional: `export E2E_TEST_PASSWORD="YourCustomPassword123!"`

## Running

```bash
pnpm test:e2e            # all tests
pnpm test:e2e -- rls.spec.ts   # RLS only
pnpm test:e2e:ui         # UI mode
pnpm test:e2e:debug      # step-by-step debugger
pnpm test:e2e:list       # syntax validation (no browser needed)
```

## Cleanup

After tests, run in Supabase SQL Editor:

```sql
DELETE FROM medications WHERE name LIKE '[E2E-TEST]%' OR name LIKE '[E2E-RLS]%';
DELETE FROM pacientes WHERE name LIKE '[E2E-TEST]%' OR name LIKE '[E2E-RLS]%';
DELETE FROM patient_trip_adjustments WHERE reason LIKE '[E2E-RLS]%';
DELETE FROM vacations WHERE reason LIKE '[E2E-RLS]%';
DELETE FROM retention_policies WHERE paciente_id IN (SELECT id FROM pacientes WHERE name LIKE '[E2E-RLS]%');
DELETE FROM notification_settings WHERE paciente_id IN (SELECT id FROM pacientes WHERE name LIKE '[E2E-RLS]%');
DELETE FROM plans WHERE notes LIKE '[E2E-RLS]%';
DELETE FROM temporadas WHERE name LIKE '[E2E-RLS]%';
```

## Known Limitations

1. **RLS tests cover cross-user access only.** They validate user B cannot access user A's data. Role granularity (cuidador principal vs secundario) is future scope.
2. **Test users must be created manually.** The anon key lacks admin rights for API user creation.
3. **Tests depend on real Supabase RLS policies.** If policies in `0001_initial_schema.sql` change, RLS tests will catch it.
4. **Offline test checks IndexedDB `outbox` store.** If the store name changes, update `offline.spec.ts`.
5. **Selectors use flexible `or()` chains** for Spanish/English labels. May need updating if UI changes significantly.
