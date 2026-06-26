# notify-fallback Edge Function

## Purpose

Sends web-push (VAPID), email (Resend), and SMS (Twilio) notifications when a `tomas` row is inserted or when the `pg_cron` dispatch job fires. The in-app channel is handled by the Service Worker; this function is for opt-in email/SMS/web-push fallbacks.

## Deploy

```bash
supabase functions deploy notify-fallback --no-verify-jwt
```

## Required Secrets

```bash
# Supabase (required)
supabase secrets set SUPABASE_URL=<your-project-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# VAPID (required for web-push — see VAPID.md for key generation)
supabase secrets set VAPID_PUBLIC_KEY=<your-public-key>
supabase secrets set VAPID_PRIVATE_KEY=<your-private-key>
supabase secrets set VAPID_SUBJECT=mailto:admin@medicamentos.app

# Resend (optional — for email notifications)
supabase secrets set RESEND_API_KEY=<your-resend-key>

# Twilio (optional — for SMS notifications)
supabase secrets set TWILIO_ACCOUNT_SID=<your-twilio-sid>
supabase secrets set TWILIO_AUTH_TOKEN=<your-twilio-token>
supabase secrets set TWILIO_FROM_NUMBER=<your-twilio-phone>

# App URL (optional — defaults to https://medicamentos.app)
supabase secrets set APP_URL=https://your-app-domain.com
```

## Trigger

Run `supabase/migrations/0003_notify_fallback_trigger.sql` to set up the DB trigger on `tomas` INSERT.
Run `supabase/migrations/0015_push_dispatch_cron.sql` to set up the pg_cron job that dispatches push every minute.

## Behavior

1. DB trigger fires on `tomas` INSERT **or** pg_cron calls every minute.
2. Calls this Edge Function via `net.http_post` with `{ tomaId, pacienteId }`.
3. Function fetches the toma details (medication name, dose, paciente name).
4. Reads `notification_settings` for the paciente.
5. For each enabled channel:
   - `web_push`: sends via VAPID web-push to all active family subscribers (if VAPID keys are set)
   - `in_app`: skipped (handled by SW)
   - `email`: sends via Resend API (if `RESEND_API_KEY` is set)
   - `sms`: sends via Twilio API (if Twilio credentials are set)
6. **Always returns 200** — missing env vars are logged, not thrown.

## Web Push Details

When `web_push` is enabled in `notification_settings` and VAPID keys are configured:

1. Calls `get_active_push_subscribers(paciente_id)` RPC to find active subscriptions for all active family members.
2. For each subscription, sends a VAPID web-push with TTL 60 and urgency `high`.
3. On success: logs `notification_deliveries` row with `status='success'`.
4. On HTTP 410/404: marks the subscription `is_active=false` and logs `status='failure'` with error.
5. On other errors: logs `status='failure'` with the error message and continues to next subscription.

See `VAPID.md` for key generation and management.

## v1 Limitations

- Email and SMS require the user's email/phone to be stored in a profile table (not yet implemented). The function logs the intent but doesn't send actual messages until user contact info is available.
- The function is called synchronously from the DB trigger. If the function is slow, it could delay the INSERT. Consider making it async in production.
