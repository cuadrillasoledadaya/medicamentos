-- Migration 0004: In-database toma materialization with pg_cron
--
-- Replaces the original 0002 (which tried to call the Edge Function via
-- net.http_post and failed because the SQL Editor role cannot set the
-- app.supabase_url / app.supabase_service_role_key custom parameters).
--
-- This migration:
--   1. Creates a PL/pgSQL function `public.materialize_tomas(days_ahead)`
--      that reads active plans and their schedules and inserts tomas for
--      the next N days. All work is done in pure SQL — no HTTP, no
--      service_role_key, no custom settings. Timezone is handled via
--      `timestamp at time zone`.
--   2. Creates a pg_cron job `medication-toma-materialization` that
--      calls the function daily at 06:00 UTC.
--
-- The function is also exposed so the schedule-generator Edge Function
-- (and ad-hoc SQL) can call it, giving a single source of truth for
-- the materialization logic.
--
-- Idempotency: tomas are inserted with ON CONFLICT (schedule_id,
-- scheduled_at) DO NOTHING. The unique index on those columns makes
-- repeated runs safe.
--
-- Requires: pg_cron and btree_gist extensions (already enabled in the
-- project; see earlier discovery note in obs 199).

-- ---------------------------------------------------------------------------
-- 1. materialize_tomas function
-- ---------------------------------------------------------------------------
create or replace function public.materialize_tomas(days_ahead int default 7)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created int := 0;
  v_skipped_vacation int := 0;
  v_skipped_existing int := 0;
  v_schedule record;
  v_target_date date;
  v_target_dow int;
  v_target_ts timestamptz;
  v_local_ts timestamp;
  v_now date := current_date;
begin
  -- Iterate over every active schedule joined to its active medication
  -- and the medication's paciente (for cuidador_id as registered_by).
  for v_schedule in
    select
      s.id            as schedule_id,
      s.time_of_day   as time_of_day,
      s.weekday_mask  as weekday_mask,
      s.timezone_id   as timezone_id,
      m.id            as medication_id,
      m.paciente_id   as paciente_id,
      p.cuidador_id   as cuidador_id
    from schedules s
    join medications m on m.id = s.medication_id and m.active = true
    join pacientes   p on p.id = m.paciente_id
    where s.active = true
  loop
    for i in 0..(days_ahead - 1) loop
      v_target_date := v_now + i;

      -- Day of week in the schedule's timezone.
      -- We use the date's local weekday under the target timezone by
      -- reading the weekday at noon in that TZ. (At noon avoids DST
      -- midnight edge cases for the weekday read.)
      v_target_dow := extract(
        dow from (v_target_date::text || ' 12:00:00')::timestamp
                 at time zone coalesce(v_schedule.timezone_id, 'UTC')
      )::int;

      -- Check if this weekday is in the weekday_mask (Sun=0 bit, Mon=1 bit, ...)
      if (v_schedule.weekday_mask & (1 << v_target_dow)) = 0 then
        continue;
      end if;

      -- Build a local timestamp (no TZ) for this date + time_of_day,
      -- then convert to timestamptz in the schedule's timezone.
      v_local_ts := (v_target_date::text || ' ' || v_schedule.time_of_day)::timestamp;
      v_target_ts := v_local_ts at time zone coalesce(v_schedule.timezone_id, 'UTC');

      -- If the target time is already in the past for today, skip.
      if i = 0 and v_target_ts <= now() then
        continue;
      end if;

      -- Check for an active vacation (global or per-medication).
      if exists (
        select 1 from vacations v
        where v.paciente_id = v_schedule.paciente_id
          and (v.medication_id is null or v.medication_id = v_schedule.medication_id)
          and v.starts_at <= v_target_ts
          and v.ends_at   >= v_target_ts
      ) then
        -- Vacation: insert a skipped toma. The adherence view excludes
        -- these from the denominator, so they don't count against the
        -- patient.
        insert into tomas (
          schedule_id, paciente_id, scheduled_at, status, skip_reason, registered_by
        ) values (
          v_schedule.schedule_id, v_schedule.paciente_id, v_target_ts,
          'skipped', 'vacation', v_schedule.cuidador_id
        )
        on conflict (schedule_id, scheduled_at) do nothing;
        v_skipped_vacation := v_skipped_vacation + 1;
      else
        -- Normal: insert a pending toma.
        insert into tomas (
          schedule_id, paciente_id, scheduled_at, status, registered_by
        ) values (
          v_schedule.schedule_id, v_schedule.paciente_id, v_target_ts,
          'pending', v_schedule.cuidador_id
        )
        on conflict (schedule_id, scheduled_at) do nothing;
        v_created := v_created + 1;
      end if;
    end loop;
  end loop;

  raise notice 'materialize_tomas: created=%, skipped_vacation=%', v_created, v_skipped_vacation;
  return v_created;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Schedule the daily cron job
-- ---------------------------------------------------------------------------
-- Runs every day at 06:00 UTC. Adjust the cron expression to your
-- preferred hour; remember the hour is in UTC.
select cron.schedule(
  'medication-toma-materialization',
  '0 6 * * *',
  $cmd$ select public.materialize_tomas(7); $cmd$
);

-- ---------------------------------------------------------------------------
-- 3. Optional: refactor the schedule-generator Edge Function to call the
--    SQL function above. This unifies the materialization logic in one
--    place. The migration doesn't touch the Edge Function source on
--    purpose — the cron-driven path works without redeploying it. The
--    Edge Function can be refactored in a follow-up to call this same
--    function via:
--      supabase.rpc('materialize_tomas', { days_ahead: 7 })
-- ---------------------------------------------------------------------------
