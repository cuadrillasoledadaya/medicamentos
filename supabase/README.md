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
| RLS verification | **PR 7** | Dedicated Playwright `rls.spec.ts` suite will validate the contract |

## Edge Functions

### schedule-generator

Generates `tomas` rows for the next 7 days based on active schedules. Deployed as a Supabase Edge Function and scheduled daily via `pg_cron` or Supabase's Scheduled Functions UI.

**Deploy:**
```bash
supabase functions deploy schedule-generator --no-verify-jwt
supabase secrets set SUPABASE_URL=<project-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-key>
```

**Schedule:** Run `supabase/migrations/0002_schedule_generator_cron.sql` or use the Supabase dashboard → Edge Functions → Schedule.

### notify-fallback

Sends email (Resend) and SMS (Twilio) notifications when a toma is inserted. Triggered by a DB trigger. Gracefully handles missing API keys.

**Deploy:**
```bash
supabase functions deploy notify-fallback --no-verify-jwt
supabase secrets set RESEND_API_KEY=<key>       # optional
supabase secrets set TWILIO_ACCOUNT_SID=<sid>    # optional
supabase secrets set TWILIO_AUTH_TOKEN=<token>   # optional
supabase secrets set TWILIO_FROM_NUMBER=<number> # optional
```

**Trigger:** Run `supabase/migrations/0003_notify_fallback_trigger.sql`.

See `docs/notifications.md` for the full pipeline explanation.

## Notes

- The actual Supabase URL and anon key will be provided by the project owner in a follow-up step.
- Do **not** commit `.env.local` — it is in `.gitignore`.
- This migration is idempotent-safe when run against a truly empty database.
