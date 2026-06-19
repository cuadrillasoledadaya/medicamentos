# Supabase Setup — Medicamentos PWA

## Overview

This is a **fresh-project migration**. There are no existing tables to drop or migrate. The SQL file below creates the entire schema from scratch against an empty Supabase Postgres database.

## How to Apply

1. **Create a new Supabase project** at [supabase.com](https://supabase.com).
2. Go to **Settings -> API** and copy:
   - **Project URL**
   - **anon public key**
3. Copy `.env.example` to `.env.local` and paste the values:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```
4. **Apply the migration**:
   - Open the Supabase dashboard -> **SQL Editor**.
   - Paste the contents of `supabase/migrations/0001_initial_schema.sql`.
   - Click **Run**.
5. Verify: run `\dt` in the SQL editor to confirm all 15+ tables exist.

## What This Migration Creates

| Category | Objects |
|----------|---------|
| Tables | 17 (pacientes, family_members, temporadas, plans, medications, schedules, tomas, tomas_archive, vacations, retention_policies, notification_settings, interactions, stock_adjustments, adherence_daily, temporada_reopen_audit, patient_trip_adjustments, dose_units) |
| Enums | 5 (intake_status, interaction_severity, family_role, family_membership_state, notification_channel) |
| Views | 2 (v_adherence_28d, tomas_due) |
| Triggers | 3 (immutability, stock decrement, stock audit) |
| RLS Policies | Full coverage on all data tables |
| Seed Data | dose_units list, severity values, role values |

## Deferred Items

| Item | Status | Reason |
|------|--------|--------|
| `adherence_daily` rollup function | **OFF** in v1 | Computed via `v_adherence_28d` view at query time; function commented out for v2 |
| `notify-fallback` Edge Function | **Later PR** | Requires Resend/Twilio credentials; not needed for in-app notifications |
| RLS verification | **PR 7** | Dedicated Playwright `rls.spec.ts` suite will validate the contract |

## Notes

- The actual Supabase URL and anon key will be provided by the project owner in a follow-up step.
- Do **not** commit `.env.local` — it is in `.gitignore`.
- This migration is idempotent-safe when run against a truly empty database.
