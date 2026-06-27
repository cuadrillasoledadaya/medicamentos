-- Migration 0020: Hardcode push cron config (Supabase managed workaround)
--
-- Previous: 0015 read app.supabase_url and app.supabase_service_role_key via
-- current_setting(), which requires ALTER SYSTEM SET — NOT available in
-- Supabase managed databases (the SQL Editor and CLI service_role both
-- lack the privilege; 42501 permission denied).
--
-- This migration replaces public.materialize_due_pushes() with a version
-- that hardcodes the project URL and service_role key inline. This is a
-- known anti-pattern (secret in source) — accepted as a temporary fix so
-- push notifications actually fire. A follow-up change should introduce
-- an app_config table or move the dispatch logic into the Edge Function
-- itself (where env vars ARE accessible).
--
-- SECURITY: the service_role key below must be rotated in Supabase
-- immediately after this migration is applied, and again whenever it
-- changes. The previous key (the one hardcoded here) becomes invalid
-- after rotation, which is the desired outcome.
--
-- TODO: move config to app_config(key text primary key, value jsonb) and
-- have this function read from there. See the sdd-explore diagnosis
-- for the full plan.

create or replace function public.materialize_due_pushes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_url text := 'https://cmoydmfdhssxdmwqlueg.supabase.co/functions/v1/notify-fallback';
  v_auth text := 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtb3lkbWZkaHNzeGRtd3FsdWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg2NjM1MCwiZXhwIjoyMDk3NDQyMzUwfQ.jQ2Neqi4ot9etW5t9JOf5s643PD3UBW3_Dn_lb8GVtU';
begin
  for v_row in
    select toma_id, paciente_id
    from public.tomas_due_for_push
  loop
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', v_auth
      ),
      body := jsonb_build_object(
        'tomaId', v_row.toma_id,
        'pacienteId', v_row.paciente_id
      )
    );
  end loop;
end;
$$;
