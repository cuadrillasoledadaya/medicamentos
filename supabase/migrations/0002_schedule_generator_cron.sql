-- Migration 0002: Schedule Generator Cron Job
-- Sets up a daily pg_cron job that calls the schedule-generator Edge Function.
-- Requires pg_net extension (enabled by default in Supabase).

-- Ensure pg_net is available
create extension if not exists "pg_net";

-- Schedule the daily cron at 06:00 UTC
-- Adjust the cron expression to match your desired timezone.
-- The Edge Function generates tomas for the next 7 days, so running once daily is sufficient.
select cron.schedule(
  'medication-schedule-generator',
  '0 6 * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/schedule-generator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Note: The app.supabase_url and app.supabase_service_role_key settings
-- must be configured in your Supabase project's database settings:
--
-- alter system set app.supabase_url = 'https://your-project.supabase.co';
-- alter system set app.supabase_service_role_key = 'your-service-role-key';
-- select pg_reload_conf();
--
-- Alternatively, use Supabase's Scheduled Functions UI instead of pg_cron.
