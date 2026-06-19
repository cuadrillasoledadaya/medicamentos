# Notifications Pipeline — Medicamentos PWA

## Overview

The notification system has three channels:

| Channel | Where it runs | Trigger | Default |
|---------|--------------|---------|---------|
| `in_app` | Service Worker (browser) | `setTimeout` / `showTrigger` per toma | ON |
| `email` | Supabase Edge Function (notify-fallback) | DB trigger on `tomas` INSERT | OFF |
| `sms` | Supabase Edge Function (notify-fallback) | DB trigger on `tomas` INSERT | OFF |

## How It Works

### 1. Schedule Generator (Edge Function)

- **Function**: `supabase/functions/schedule-generator/index.ts`
- **Schedule**: Daily at 06:00 UTC via `pg_cron`
- **What it does**: Reads all active schedules, generates `tomas` rows for the next 7 days
- **Idempotent**: Uses `(schedule_id, scheduled_at)` unique constraint

### 2. Service Worker Notification Scheduler (Client)

- **File**: `src/sw.ts`
- **How it works**:
  1. Main thread sends `SCHEDULE` message to SW with toma details
  2. SW sets a `setTimeout` (or uses `showTrigger` where supported)
  3. At the scheduled time, SW calls `showNotification` with 3 action buttons
  4. User taps an action → SW sends message back to main thread
  5. Main thread updates the toma status via React Query mutation

- **Action buttons**:
  - "Marcar como tomada" → sets `status = taken_on_time`
  - "Posponer 10 min" → reschedules notification
  - "Saltar" → sets `status = skipped`

### 3. Notify Fallback (Edge Function)

- **Function**: `supabase/functions/notify-fallback/index.ts`
- **Trigger**: DB trigger on `tomas` INSERT (only for `status = 'pending'`)
- **What it does**: Reads `notification_settings`, sends email/SMS if enabled
- **Graceful degradation**: Missing env vars → log + return 200 (never crashes)

## Deployment Steps

### Prerequisites

1. Supabase project with `pg_net` extension enabled
2. `pg_cron` enabled (for schedule generator scheduling)

### Step 1: Deploy Edge Functions

```bash
# Schedule generator
supabase functions deploy schedule-generator --no-verify-jwt
supabase secrets set SUPABASE_URL=<project-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-key>

# Notify fallback
supabase functions deploy notify-fallback --no-verify-jwt
supabase secrets set SUPABASE_URL=<project-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-key>
```

### Step 2: Set Optional Secrets (for email/SMS)

```bash
# Email (Resend)
supabase secrets set RESEND_API_KEY=<key>

# SMS (Twilio)
supabase secrets set TWILIO_ACCOUNT_SID=<sid>
supabase secrets set TWILIO_AUTH_TOKEN=<token>
supabase secrets set TWILIO_FROM_NUMBER=<number>

# App URL
supabase secrets set APP_URL=https://your-app.com
```

### Step 3: Run Migrations

```bash
# Schedule generator cron
supabase db push --include-all  # or run 0002_schedule_generator_cron.sql manually

# Notify fallback trigger
supabase db push --include-all  # or run 0003_notify_fallback_trigger.sql manually
```

### Step 4: Configure Database Settings

```sql
alter system set app.supabase_url = 'https://your-project.supabase.co';
alter system set app.supabase_service_role_key = 'your-service-role-key';
select pg_reload_conf();
```

## Testing

### Test Schedule Generator

```bash
curl -X POST https://your-project.supabase.co/functions/v1/schedule-generator \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{
  "status": "ok",
  "summary": {
    "totalSchedules": 5,
    "created": 20,
    "skippedVacation": 2,
    "skippedExisting": 0,
    "errors": 0,
    "elapsedMs": 1500
  }
}
```

### Test Notify Fallback

```bash
curl -X POST https://your-project.supabase.co/functions/v1/notify-fallback \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"tomaId": "your-toma-uuid", "pacienteId": "your-paciente-uuid"}'
```

### Test In-App Notifications

1. Open the app in Chrome desktop
2. Accept notification permission prompt
3. Create a schedule with a time 1-2 minutes in the future
4. Wait for the notification to appear
5. Test each action button

## v1 Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| iOS PWA background notifications unreliable | Notifications may not fire when app is backgrounded | Dashboard banner shows pending tomas; email/SMS fallbacks |
| `setTimeout` only works while app is open | Notifications won't fire if user closes the app | Schedule generator creates tomas; user sees them on next open |
| No push server (Firebase/OneSignal) | No true background push notifications | Documented as v2 enhancement |
| Email/SMS require user contact info | Function logs intent but doesn't send until profile table exists | v1: in-app only; v2: add user profile with email/phone |
| Timezone conversion is approximate | `scheduled_at` stored as UTC without proper TZ conversion | Use `date-fns-tz` in Edge Function for accurate conversion |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for admin access |
| `RESEND_API_KEY` | No | Resend API key for email notifications |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID for SMS |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token for SMS |
| `TWILIO_FROM_NUMBER` | No | Twilio phone number to send from |
| `APP_URL` | No | Base URL for intake links (default: https://medicamentos.app) |
