# schedule-generator Edge Function

## Purpose

Daily cron job that reads all active schedules and generates `tomas` rows for the next 7 days. Idempotent via the `(schedule_id, scheduled_at)` unique constraint.

## Deploy

```bash
supabase functions deploy schedule-generator --no-verify-jwt
```

## Required Secrets

```bash
supabase secrets set SUPABASE_URL=<your-project-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Scheduling

### Option A: Supabase Scheduled Functions (recommended)

1. Go to your Supabase dashboard → Edge Functions → Schedule.
2. Create a new schedule:
   - Function: `schedule-generator`
   - Cron: `0 6 * * *` (daily at 06:00 UTC; adjust to your timezone)
   - Body: `{}`

### Option B: pg_cron via SQL migration

Run `supabase/migrations/0002_schedule_generator_cron.sql` which sets up a `pg_cron` job that calls the function daily.

Requires `pg_net` extension enabled in your Supabase project.

## Behavior

- Reads all `schedules` where `active = true` and their medications are active.
- For each schedule, generates tomas for the next 7 days matching the `weekday_mask`.
- If a date falls within a vacation, creates a `skipped` toma with `skip_reason = 'vacation'`.
- Upserts via `(schedule_id, scheduled_at)` — re-running does not duplicate.
- Returns a JSON summary: `{ created, skippedVacation, skippedExisting, errors }`.

## v1 Limitations

- Timezone conversion is approximate (stores UTC times based on schedule time_of_day). For accurate TZ-aware scheduling, integrate `date-fns-tz` in the Edge Function.
- The `registered_by` field uses a system UUID when run as a cron job (no user session).
