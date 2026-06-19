-- Migration 0003: Notify Fallback Trigger
-- Sets up a DB trigger on tomas INSERT that calls the notify-fallback Edge Function.
-- Requires pg_net extension (enabled by default in Supabase).

-- Ensure pg_net is available
create extension if not exists "pg_net";

-- Function that calls the notify-fallback Edge Function
create or replace function public.notify_fallback_on_toma_insert() returns trigger
  language plpgsql security definer as $$
begin
  -- Only trigger for pending tomas (not vacation-skipped)
  if NEW.status = 'pending' then
    perform net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notify-fallback',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object('tomaId', NEW.id, 'pacienteId', NEW.paciente_id)
    );
  end if;
  return NEW;
end;
$$;

-- Create the trigger
drop trigger if exists tomas_notify_fallback on tomas;
create trigger tomas_notify_fallback
  after insert on tomas
  for each row execute function public.notify_fallback_on_toma_insert();

-- Note: The app.supabase_url and app.supabase_service_role_key settings
-- must be configured in your Supabase project's database settings:
--
-- alter system set app.supabase_url = 'https://your-project.supabase.co';
-- alter system set app.supabase_service_role_key = 'your-service-role-key';
-- select pg_reload_conf();
