# notify-fallback Edge Function

## Purpose

Sends email (Resend) and SMS (Twilio) notifications when a `tomas` row is inserted. Triggered by a DB trigger. The in-app channel is handled by the Service Worker; this function is for opt-in email/SMS fallbacks.

## Deploy

```bash
supabase functions deploy notify-fallback --no-verify-jwt
```

## Required Secrets

```bash
# Supabase (required)
supabase secrets set SUPABASE_URL=<your-project-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

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

## Behavior

1. DB trigger fires on `tomas` INSERT.
2. Calls this Edge Function via `net.http_post` with `{ tomaId, pacienteId }`.
3. Function fetches the toma details (medication name, dose, paciente name).
4. Reads `notification_settings` for the paciente.
5. For each enabled channel:
   - `in_app`: skipped (handled by SW)
   - `email`: sends via Resend API (if `RESEND_API_KEY` is set)
   - `sms`: sends via Twilio API (if Twilio credentials are set)
6. **Always returns 200** — missing env vars are logged, not thrown.

## v1 Limitations

- Email and SMS require the user's email/phone to be stored in a profile table (not yet implemented). The function logs the intent but doesn't send actual messages until user contact info is available.
- The function is called synchronously from the DB trigger. If the function is slow, it could delay the INSERT. Consider making it async in production.
