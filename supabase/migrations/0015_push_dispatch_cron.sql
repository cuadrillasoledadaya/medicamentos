-- Migration 0015: Push dispatch cron job
--
-- Creates a pg_cron job that runs every minute to find tomas due for push
-- delivery and calls the notify-fallback Edge Function via net.http_post.
--
-- Functions:
--   get_active_push_subscribers(paciente_id) — returns active push subscriptions
--     for all active family members of the given paciente
--   materialize_due_pushes() — scans tomas_due_for_push view, calls Edge Function
--     for each due toma via net.http_post
--   snooze_toma(toma_id) — lightweight RPC to snooze a toma by 10 minutes
--
-- Cron job:
--   'notify-push-due-tomas' — runs '* * * * *' (every minute)
--
-- Requires: pg_cron, pg_net extensions (already enabled in project)
-- GUC settings: app.supabase_url, app.supabase_service_role_key (see 0003)

-- ---------------------------------------------------------------------------
-- 1. get_active_push_subscribers(paciente_id)
-- ---------------------------------------------------------------------------
create or replace function public.get_active_push_subscribers(paciente_id uuid)
returns setof public.push_subscriptions
language sql
security definer
set search_path = public
as $$
  select ps.*
  from public.push_subscriptions ps
  join family_members fm on fm.user_id = ps.user_id
  where fm.paciente_id = get_active_push_subscribers.paciente_id
    and fm.status = 'active'
    and ps.is_active = true;
$$;

-- ---------------------------------------------------------------------------
-- 2. materialize_due_pushes()
-- ---------------------------------------------------------------------------
create or replace function public.materialize_due_pushes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_url text;
  v_key text;
begin
  -- Read GUC settings (must be configured via alter system set)
  v_url := current_setting('app.supabase_url');
  v_key := current_setting('app.supabase_service_role_key');

  for v_row in
    select toma_id, paciente_id
    from public.tomas_due_for_push
  loop
    perform net.http_post(
      url := v_url || '/functions/v1/notify-fallback',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object(
        'tomaId', v_row.toma_id,
        'pacienteId', v_row.paciente_id
      )
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Schedule the cron job — every minute
-- ---------------------------------------------------------------------------
select cron.schedule(
  'notify-push-due-tomas',
  '* * * * *',
  $cmd$ select public.materialize_due_pushes(); $cmd$
);

-- ---------------------------------------------------------------------------
-- 4. snooze_toma RPC — lightweight endpoint for SW action button
-- ---------------------------------------------------------------------------
create or replace function public.snooze_toma(p_toma_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.tomas
  set snoozed_until = now() + interval '10 minutes'
  where id = p_toma_id
    and status = 'pending'
    and is_active_family_member(paciente_id);
$$;

-- ---------------------------------------------------------------------------
-- Note: app.supabase_url and app.supabase_service_role_key must be
-- configured in your Supabase project's database settings:
--
--   alter system set app.supabase_url = 'https://your-project.supabase.co';
--   alter system set app.supabase_service_role_key = 'your-service-role-key';
--   select pg_reload_conf();
